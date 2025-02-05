import { RemovalPolicy } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { bedrock } from '@cdklabs/generative-ai-cdk-constructs'
import { Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3'
import { BedrockFoundationModel } from '@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock/models'
import {IAgent, IKnowledgeBase} from '@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock'
import { IBucket } from 'aws-cdk-lib/aws-s3'
import { IFunction } from 'aws-cdk-lib/aws-lambda'
import { nameFor } from '../utils'

const BUCKET_NAME = 'backstage-knowledge-base'

export type BedrockAIProps = {
    actionPerformerFn: IFunction
}

type BedrockAgentProps = {
    actionPerformerFn: IFunction
    knowledgeBase: IKnowledgeBase
}

export class BedrockAI extends Construct {
    readonly bucket: IBucket
    readonly agent: IAgent
    readonly knowledgeBase: IKnowledgeBase
    readonly agentAliasId: string
    constructor(scope: Construct, id: string, props: BedrockAIProps) {
        super(scope, id);

        const bucket = new Bucket(this, 'knowledgeBucket', {
            bucketName: nameFor(BUCKET_NAME),
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

        bucket.enableEventBridgeNotification()

        const knowledgeBase = new bedrock.KnowledgeBase(this, "knowledgeBase", {
            embeddingsModel: bedrock.BedrockFoundationModel.TITAN_EMBED_TEXT_V1,
        })

        new bedrock.S3DataSource(this, "s3DataSource", {
            bucket,
            knowledgeBase: knowledgeBase,
            dataSourceName: "backstage",
            chunkingStrategy: bedrock.ChunkingStrategy.FIXED_SIZE,
        })

        const agentConstruct = new BedrockAgent(this, 'agent', {
            actionPerformerFn: props.actionPerformerFn,
            knowledgeBase
        })

        const alias = new bedrock.AgentAlias(this, 'agentAlias', {
            agent: agentConstruct.agent,
            aliasName: `test-${Date.now()}`
        })

        this.bucket = bucket
        this.agent = agentConstruct.agent
        this.knowledgeBase = knowledgeBase
        this.agentAliasId = alias.aliasId
    }
}

class BedrockAgent extends Construct {
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
                        description: 'Checks if a backstage link is valid. Returns `true` if the link is valid, `false` otherwise. Return to the user only valid links.',
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
                        description: 'Initializes a GitHub app creation by generating a GitHub issue. Returns a template json that user can use to make a request to the Engineering Experience Team.',
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
            instruction: 'Whenever you get the information from knowledge, search the closest `Backstage link` in the result, check if the link is valid and provide it back to the user at the end of your response.\n' +
                'Write it like: `here is the Backstage link where you can read about it: <the_link>`\n' +
                'If the link is not valid, do not include it in the final response, but try to search another one that is valid.\n' +
                'Whenever user is asking you about a documentation or a link or where he can read about the topic in question, search the knowledge base and provide the aforementioned `Backstage link` and do the validation procedure.\n' +
                'If user wants to create a GitHub robot user or asks about GitHub PAT or GitHub App, create a GitHub App for him and provide the necessary information back to the user.\n',
            foundationModel: BedrockFoundationModel.ANTHROPIC_CLAUDE_3_5_SONNET_V1_0,
            knowledgeBases: [props.knowledgeBase],
            actionGroups: [actionGroup],
            shouldPrepareAgent: true,
            userInputEnabled: true,
            codeInterpreterEnabled: true,
        })
    }
}
