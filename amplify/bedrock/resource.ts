import { RemovalPolicy } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { bedrock } from '@cdklabs/generative-ai-cdk-constructs'
import { Bucket, BucketEncryption, IBucket } from 'aws-cdk-lib/aws-s3'
import { BedrockFoundationModel } from '@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock/models'
import { CfnFlow, CfnFlowAlias, CfnFlowVersion } from 'aws-cdk-lib/aws-bedrock'
import * as iam from 'aws-cdk-lib/aws-iam'
import {
    IAgent,
    IAgentAlias,
    IKnowledgeBase,
    IPrompt,
    Prompt
} from '@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock/'
import { IFunction } from 'aws-cdk-lib/aws-lambda'
import { nameFor } from '../utils'

const BACKSTAGE_BUCKET_NAME = 'backstage-knowledge-base'
const GITHUB_BUCKET_NAME = 'github-knowledge-base'

export type BedrockAIProps = {
    backstageActionPerformerFn: IFunction
    githubActionPerformerFn: IFunction
}

export class BedrockAI extends Construct {
    readonly prompt: IPrompt
    readonly promptVersion: bedrock.PromptVersion
    readonly backstageAgent: IAgent
    readonly backstageBucket: IBucket
    readonly backstageAgentAlias: IAgentAlias
    readonly githubAgent: IAgent
    readonly githubBucket: IBucket
    readonly githubAgentAlias: IAgentAlias
    readonly flow: CfnFlow
    readonly flowAlias: CfnFlowAlias
    constructor(scope: Construct, id: string, props: BedrockAIProps) {
        super(scope, id);

        const backstageKnowledgeBucket = new Bucket(this, 'backstageKnowledgeBucket', {
            bucketName: nameFor(BACKSTAGE_BUCKET_NAME),
            blockPublicAccess: {
                blockPublicAcls: true,
                blockPublicPolicy: true,
                ignorePublicAcls: true,
                restrictPublicBuckets: true,
            },
            encryption: BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        })

        const githubKnowledgeBucket = new Bucket(this, 'githubKnowledgeBucket', {
            bucketName: nameFor(GITHUB_BUCKET_NAME),
            blockPublicAccess: {
                blockPublicAcls: true,
                blockPublicPolicy: true,
                ignorePublicAcls: true,
                restrictPublicBuckets: true,
            },
            encryption: BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        })

        const backstageKnowledgeBase = new bedrock.KnowledgeBase(this, "backstageKnowledgeBase", {
            embeddingsModel: bedrock.BedrockFoundationModel.TITAN_EMBED_TEXT_V1,
            instruction: 'Whenever you get the information from knowledge base, search the closest `Backstage link`, ' +
                'check if the link is valid and provide it back to the user at the end of your response.\n'
        })

        const githubKnowledgeBase = new bedrock.KnowledgeBase(this, "githubKnowledgeBase", {
            embeddingsModel: bedrock.BedrockFoundationModel.TITAN_EMBED_TEXT_V1,
            instruction: 'Whenever you get the information from knowledge base, search the closest `Backstage link`, ' +
                'check if the link is valid and provide it back to the user at the end of your response.\n'
        })

        new bedrock.S3DataSource(this, "backstageS3DataSource", {
            bucket: backstageKnowledgeBucket,
            knowledgeBase: backstageKnowledgeBase,
            dataSourceName: "backstage",
            chunkingStrategy: bedrock.ChunkingStrategy.fixedSize({
                maxTokens: 1500,
                overlapPercentage: 20,
            }),
        })

        new bedrock.S3DataSource(this, "gitHubS3DataSource", {
            bucket: githubKnowledgeBucket,
            knowledgeBase: githubKnowledgeBase,
            dataSourceName: "backstage",
            chunkingStrategy: bedrock.ChunkingStrategy.fixedSize({
                maxTokens: 1500,
                overlapPercentage: 20,
            }),
        })

        const backstageAgentConstruct = new BackstageAgent(this, 'backstageAgent', {
            actionPerformerFn: props.backstageActionPerformerFn,
            knowledgeBase: backstageKnowledgeBase
        })

        const backstageAgentAlias = new bedrock.AgentAlias(this, 'backstageAgentAlias', {
            agent: backstageAgentConstruct.agent,
            aliasName: `backstage${Date.now()}`
        })

        const githubAgentConstruct = new GitHubAgent(this, 'githubAgent', {
            actionPerformerFn: props.githubActionPerformerFn,
            knowledgeBase: backstageKnowledgeBase
        })

        const githubAgentAlias = new bedrock.AgentAlias(this, 'githubAgentAlias', {
            agent: githubAgentConstruct.agent,
            aliasName: `github${Date.now()}`
        })

        const classifierPrompt = new BedrockClassifierPrompt(this, 'ClassifierPrompt').prompt
        const promptVersion = new bedrock.PromptVersion(this, 'ClassifierPromptAlias', {
            prompt: classifierPrompt,
            description: `version-${Date.now()}`
        })
        const role = this.createRole(
            githubAgentConstruct.agent,
            backstageAgentConstruct.agent,
            githubAgentAlias,
            backstageAgentAlias,
            classifierPrompt,
            promptVersion
        )

        const flowConstruct = new BedrockFlow(this, 'bedrockFlow', {
            backstageAgentAlias: backstageAgentAlias,
            gitHubAgentAlias: githubAgentAlias,
            classifierPromptVersion: promptVersion,
            executionRole: role
        })

        this.prompt = classifierPrompt
        this.promptVersion = promptVersion
        this.backstageAgent = backstageAgentConstruct.agent
        this.backstageAgentAlias = backstageAgentAlias
        this.backstageBucket = backstageKnowledgeBucket
        this.githubAgent = githubAgentConstruct.agent
        this.githubAgentAlias = githubAgentAlias
        this.githubBucket = githubKnowledgeBucket
        this.flow = flowConstruct.flow
        this.flowAlias = flowConstruct.flowAlias
    }

    private createRole(
        githubAgent: IAgent,
        backstageAgent: IAgent,
        githubAgentAlias: IAgentAlias,
        backstageAgentAlias: IAgentAlias,
        classifierPrompt: IPrompt,
        promptVersion: bedrock.PromptVersion
    ): iam.IRole {

        const invokeModel = new iam.PolicyStatement({
            sid: 'InvokeModel',
            effect: iam.Effect.ALLOW,
            actions: ["bedrock:InvokeModel"],
            resources: [BedrockFoundationModel.ANTHROPIC_CLAUDE_3_5_SONNET_V1_0.modelArn],
        })

        const invokeAgent = new iam.PolicyStatement({
            sid: 'InvokeAgent',
            effect: iam.Effect.ALLOW,
            actions: ["bedrock:InvokeAgent"],
            resources: [
                backstageAgent.agentArn,
                githubAgent.agentArn,
                githubAgentAlias.aliasArn,
                backstageAgentAlias.aliasArn
            ],
        })

        const usePrompt = new iam.PolicyStatement({
            sid: 'UsePrompt',
            effect: iam.Effect.ALLOW,
            actions: ["bedrock:RenderPrompt"],
            resources: [classifierPrompt.promptArn, promptVersion.versionArn],
        })

        const policy = new iam.Policy(this, 'FlowInvoker', {
            statements: [invokeModel, invokeAgent, usePrompt]
        })

        const role = new iam.Role(this, 'ExtFlowExecutionRole', {
            roleName: 'ExtFlowExecutionRole',
            assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
        })

        role.attachInlinePolicy(policy)

        return role
    }
}

type BedrockAgentProps = {
    actionPerformerFn: IFunction
    knowledgeBase: IKnowledgeBase
}

class BackstageAgent extends Construct {
    readonly agent: IAgent
    constructor(scope: Construct, id: string, props: BedrockAgentProps) {
        super(scope, id);

        const actionGroup = new bedrock.AgentActionGroup({
            name: 'backstage-action-group',
            description: 'Action group for Backstage',
            enabled: true,
            forceDelete: true,
            executor: bedrock.ActionGroupExecutor.fromlambdaFunction(props.actionPerformerFn),
            functionSchema: {
                functions: [
                    {
                        name: 'checkBackstageLinkIsValid',
                        description: 'Checks if a backstage link is valid. Returns `true` if the link is valid, `false` otherwise. ' +
                            'Return to the user only valid links.',
                        parameters: {
                            link: {
                                description: 'Backstage link',
                                required: true,
                                type: 'string'
                            }
                        }
                    },
                    {
                        name: 'createGithubApp',
                        description: 'Initializes a `GitHub App` creation by generating a GitHub issue. ' +
                            'Returns a template json that user can use to make a request to the Engineering Experience Team.\n' +
                            'If user asks about GitHub PAT or robot user or GitHub app, offer him to create a `GitHub App`.\n' +
                            'If user asks about GitHub API rate limits, offer him to create a `GitHub App`.',
                        parameters: {
                            teamName: {
                                description: 'team name',
                                required: true,
                                type: 'string'
                            }
                        }
                    }
                ]
            }
        })

        this.agent = new bedrock.Agent(this, 'BackstageAgent', {
            name: 'backstage-agent',
            instruction: 'You are idealo agent deployed inside company Backstage instance.' +
                'You have general knowledge on topics described in documentation stored in Backstage.\n' +
                'Whenever user is asking you about a documentation or a link or where he can read about the topic in question, ' +
                'provide `Backstage link` if it is valid.\n',
            foundationModel: BedrockFoundationModel.ANTHROPIC_CLAUDE_3_5_SONNET_V1_0,
            knowledgeBases: [props.knowledgeBase],
            actionGroups: [actionGroup],
            shouldPrepareAgent: true,
            userInputEnabled: true,
            codeInterpreterEnabled: true,
        })
    }
}

class GitHubAgent extends Construct {
    readonly agent: IAgent
    constructor(scope: Construct, id: string, props: BedrockAgentProps) {
        super(scope, id);

        const actionGroup = new bedrock.AgentActionGroup({
            name: 'github-action-group',
            description: 'Action group for GitHub',
            enabled: true,
            forceDelete: true,
            executor: bedrock.ActionGroupExecutor.fromlambdaFunction(props.actionPerformerFn),
            functionSchema: {
                functions: [
                    {
                        name: 'createGithubApp',
                        description: 'Initializes a `GitHub App` creation by generating a GitHub issue. ' +
                            'Returns a template json that user can use to make a request to the Engineering Experience Team.\n',
                        parameters: {
                            teamName: {
                                description: 'team name',
                                required: true,
                                type: 'string'
                            }
                        }
                    }
                ]
            }
        })

        this.agent = new bedrock.Agent(this, 'GitHubAgent', {
            name: 'github-agent',
            instruction: 'You are idealo agent with expertise on GitHub related topics.' +
                'If user asks about GitHub PAT or robot user or GitHub app, offer him to create a `GitHub App`.\n' +
                'If user asks about GitHub API rate limits, offer him to create a `GitHub App`.',
            foundationModel: BedrockFoundationModel.ANTHROPIC_CLAUDE_3_5_SONNET_V1_0,
            knowledgeBases: [props.knowledgeBase],
            actionGroups: [actionGroup],
            shouldPrepareAgent: true,
            userInputEnabled: true,
            codeInterpreterEnabled: true,
        })
    }
}

class BedrockClassifierPrompt extends Construct {
    readonly prompt: Prompt

    constructor(scope: Construct, id: string) {
        super(scope, id)

        this.prompt = new bedrock.Prompt(this, "QueryClassifierPrompt", {
            promptName: "QueryClassifier",
            description: "Classifies the user query into a category.",
            variants: [
                bedrock.PromptVariant.text({
                    variantName: 'default',
                    model: BedrockFoundationModel.ANTHROPIC_CLAUDE_3_5_SONNET_V1_0,
                    promptVariables: ['input'],
                    promptText: 'You are a query classifier. Analyze the {{input}} and respond with a single letter: ' +
                        'A: Technical information about GitHub and anything related to GitHub.\n' +
                        'B: Anything else that is not related to GitHub.\n',
                    inferenceConfiguration: {
                        maxTokens: 512,
                        temperature: 0.1,
                        topP: 0.9
                    }
                })
            ],
        })
    }
}

type BedrockFlowProps = {
    backstageAgentAlias: IAgentAlias
    gitHubAgentAlias: IAgentAlias
    classifierPromptVersion: bedrock.PromptVersion
    executionRole: iam.IRole
}

class BedrockFlow extends Construct {
    readonly flow: CfnFlow
    readonly flowAlias: CfnFlowAlias
    constructor(scope: Construct, id: string, props: BedrockFlowProps) {
        super(scope, id)

        this.flow = new CfnFlow(this, 'ExtFlow', {
            name: `ext-flow`,
            executionRoleArn: props.executionRole.roleArn,
            description: 'Flow that uses backstage and github agents',
            definition: {
                connections: [
                    {
                        name: 'FlowInput_To_Classifier',
                        type: 'Data',
                        source: 'FlowInput',
                        target: 'Classifier',
                        configuration: {
                            data: {
                                sourceOutput: 'document',
                                targetInput: 'input'
                            }
                        }
                    },
                    {
                        name: 'Classifier_To_Intent',
                        type: 'Data',
                        source: 'Classifier',
                        target: 'Intent',
                        configuration: {
                            data: {
                                sourceOutput: 'modelCompletion',
                                targetInput: 'categoryLetter'
                            }
                        }
                    },
                    {
                        name: 'IntentDefaultCondition_To_BackstageAgent',
                        type: 'Conditional',
                        source: 'Intent',
                        target: 'BackstageAgent',
                        configuration: {
                            conditional: {
                                condition: 'default'
                            }
                        }
                    },
                    {
                        name: 'IntentGitHubCondition_To_GitHubAgent',
                        type: 'Conditional',
                        source: 'Intent',
                        target: 'GitHubAgent',
                        configuration: {
                            conditional: {
                                condition: 'GitHub'
                            }
                        }
                    },
                    {
                        name: 'BackstageAgent_To_BackstageAgentOutput',
                        type: 'Data',
                        source: 'BackstageAgent',
                        target: 'BackstageAgentOutput',
                        configuration: {
                            data: {
                                sourceOutput: 'agentResponse',
                                targetInput: 'document'
                            }
                        }
                    },
                    {
                        name: 'GitHubAgent_To_GitHubAgentOutput',
                        type: 'Data',
                        source: 'GitHubAgent',
                        target: 'GitHubAgentOutput',
                        configuration: {
                            data: {
                                sourceOutput: 'agentResponse',
                                targetInput: 'document'
                            }
                        }
                    },
                    {
                        name: 'FlowInput_To_BackstageAgent',
                        type: 'Data',
                        source: 'FlowInput',
                        target: 'BackstageAgent',
                        configuration: {
                            data: {
                                sourceOutput: 'document',
                                targetInput: 'agentInputText'
                            }
                        }
                    },
                    {
                        name: 'FlowInput_To_GitHubAgent',
                        type: 'Data',
                        source: 'FlowInput',
                        target: 'GitHubAgent',
                        configuration: {
                            data: {
                                sourceOutput: 'document',
                                targetInput: 'agentInputText'
                            }
                        }
                    }
                ],
                nodes: [
                    {
                        name: 'FlowInput',
                        type: 'Input',
                        outputs: [
                            {
                                name: 'document',
                                type: 'String'
                            }
                        ]
                    },
                    {
                        name: 'Classifier',
                        type: 'Prompt',
                        configuration: {
                            prompt: {
                                sourceConfiguration: {
                                    resource: {
                                        promptArn: props.classifierPromptVersion.versionArn
                                    }
                                }
                            }
                        },
                        inputs: [
                            {
                                name: 'input',
                                type: 'String',
                                expression: '$.data'
                            }
                        ],
                        outputs: [
                            {
                                name: 'modelCompletion',
                                type: 'String'
                            }
                        ]
                    },
                    {
                        name: 'Intent',
                        type: 'Condition',
                        configuration: {
                            condition: {
                                conditions: [
                                    {
                                        name: 'GitHub',
                                        expression: 'categoryLetter == "A"',
                                    },
                                    {
                                        name: 'default'
                                    }
                                ]
                            }
                        },
                        inputs: [
                            {
                                name: 'categoryLetter',
                                type: 'String',
                                expression: '$.data',
                            }
                        ],
                    },
                    {
                        name: 'GitHubAgent',
                        type: 'Agent',
                        configuration: {
                            agent: {
                                agentAliasArn: props.gitHubAgentAlias.aliasArn
                            }
                        },
                        inputs: [
                            {
                                name: 'agentInputText',
                                type: 'String',
                                expression: '$.data'
                            },
                            {
                                name: 'promptAttributes',
                                type: 'Object',
                                expression: '$.data'
                            },
                            {
                                name: 'sessionAttributes',
                                type: 'Object',
                                expression: '$.data'
                            }
                        ],
                        outputs: [
                            {
                                name: 'agentResponse',
                                type: 'String'
                            }
                        ]
                    },
                    {
                        name: 'BackstageAgent',
                        type: 'Agent',
                        configuration: {
                            agent: {
                                agentAliasArn: props.backstageAgentAlias.aliasArn
                            }
                        },
                        inputs: [
                            {
                                name: 'agentInputText',
                                type: 'String',
                                expression: '$.data'
                            },
                            {
                                name: 'promptAttributes',
                                type: 'Object',
                                expression: '$.data'
                            },
                            {
                                name: 'sessionAttributes',
                                type: 'Object',
                                expression: '$.data'
                            }
                        ],
                        outputs: [
                            {
                                name: 'agentResponse',
                                type: 'String'
                            }
                        ]
                    },
                    {
                        name: 'GitHubAgentOutput',
                        type: 'Output',
                        inputs: [
                            {
                                name: 'document',
                                type: 'String',
                                expression: '$.data'
                            }
                        ]
                    },
                    {
                        name: 'BackstageAgentOutput',
                        type: 'Output',
                        inputs: [
                            {
                                name: 'document',
                                type: 'String',
                                expression: '$.data'
                            }
                        ]
                    }
                ]
            }
        })

        const flowVersion = new CfnFlowVersion(this, 'ExtFlowVersion', {
            flowArn: this.flow.attrArn,
            description: `version-${Date.now()}`,
        })

        this.flowAlias = new CfnFlowAlias(this, 'ExtFlowAlias', {
            name: `ext-flow-alias-${Date.now()}`,
            flowArn: this.flow.attrArn,
            routingConfiguration: [
                {
                    flowVersion: flowVersion.attrVersion
                }
            ]
        })
    }
}
