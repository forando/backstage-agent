import { CustomResource, RemovalPolicy, Stack } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { bedrock } from '@cdklabs/generative-ai-cdk-constructs'
import * as s3 from 'aws-cdk-lib/aws-s3'
import { Role, PolicyStatement, ServicePrincipal, Policy } from 'aws-cdk-lib/aws-iam'
import { BedrockFoundationModel } from '@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock/models'
import { IAgent, IKnowledgeBase } from '@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock'
import { nameFor } from '../utils'
import { IBucket } from 'aws-cdk-lib/aws-s3'
import { IFunction } from 'aws-cdk-lib/aws-lambda'
import {Provider} from 'aws-cdk-lib/custom-resources'

const BUCKET_NAME = 'backstage-knowledge-base'

export type BedrockAgentAliasProps = {
    agentId: string
    agentAliasCrFn: IFunction
}

export class BedrockAI extends Stack {
    readonly agent: IAgent
    readonly bucket: IBucket
    readonly knowledgeBase: IKnowledgeBase
    constructor(scope: Construct, id: string) {
        super(scope, id);

        const bucket = new s3.Bucket(this, 'knowledgeBucket', {
            bucketName: nameFor(BUCKET_NAME),
            blockPublicAccess: {
                blockPublicAcls: true,
                blockPublicPolicy: true,
                ignorePublicAcls: true,
                restrictPublicBuckets: true,
            },
            encryption: s3.BucketEncryption.S3_MANAGED,
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

        const agent = new bedrock.Agent(this, 'BackstageAgent', {
            name: 'backstage-agent',
            instruction: 'Whenever you get the information from knowledge, search the closest `Backstage link` in the result and provide it back to the user at the end of your response.\n' +
                'Write it like: `here is the Backstage link where you can read about it: <the_link>`\n' +
                'Whenever user is asking you about a documentation or a link or where he can read about the topic in question, search the knowledge base and provide the aforementioned `Backstage link` located close to the answer.',
            foundationModel: BedrockFoundationModel.ANTHROPIC_CLAUDE_3_5_SONNET_V1_0,
            knowledgeBases: [knowledgeBase],
            shouldPrepareAgent: true,
            codeInterpreterEnabled: true,
        })

        const agentRole = new Role(this, 'BedrockAgentRole', {
            assumedBy: new ServicePrincipal('bedrock.amazonaws.com'),
            description: 'Role for Bedrock Agent to access the Knowledge Base'
        })

        agentRole.assumeRolePolicy?.addStatements(new PolicyStatement({
            actions: ['sts:AssumeRole'],
            principals: [new ServicePrincipal('bedrock.amazonaws.com')]
        }))

        const knowledgeBasePermission = new PolicyStatement({
            sid: "AllowStartIngestionJob",
            actions: ['bedrock:Retrieve'],
            resources: [knowledgeBase.knowledgeBaseArn]
        })

        const modelPermission = new PolicyStatement({
            sid: "AllowInvokeModel",
            actions: ['bedrock:InvokeModel'],
            resources: [BedrockFoundationModel.ANTHROPIC_CLAUDE_3_5_SONNET_V1_0.modelArn]
        })

        const codeInterpreterPermission = new PolicyStatement({
            sid: "AllowInvokeCodeInterpreter",
            actions: ['bedrock:InvokeCodeInterpreter', 'bedrock:ExecuteCode'],
            resources: ['*']
        })

        const agentPolicy: Policy = new Policy(this, 'BedrockAgentPolicy', {
            statements: [knowledgeBasePermission, modelPermission, codeInterpreterPermission],
        })

        agentRole.attachInlinePolicy(agentPolicy)

        this.agent = agent
        this.bucket = bucket
        this.knowledgeBase = knowledgeBase
    }
}

/**
 * The native CDK api tries to create an alias every time it runs.
 * This results in `alias already exists` error.
 * To avoid this, we are creating a custom resource to create an alias.
 */
export class BedrockAgentAlias extends Stack {
    constructor(scope: Construct, id: string, props: BedrockAgentAliasProps) {
        super(scope, id);
        const customResourceProvider = new Provider(this, "AgentAliasCrProvider", {
            onEventHandler: props.agentAliasCrFn,
        })

        const customResourceResult = new CustomResource(this, "AgentAliasCr", {
            serviceToken: customResourceProvider.serviceToken,
            properties: {
                agentId: props.agentId,
                aliasName: 'test'
            },
        })

        this.node.addDependency(props.agentAliasCrFn)
    }
}
