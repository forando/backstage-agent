import { Stack } from 'aws-cdk-lib'
import { AuthorizationType } from 'aws-cdk-lib/aws-appsync'
import { defineBackend } from '@aws-amplify/backend'
import {
    CfnApiKey,
} from 'aws-cdk-lib/aws-appsync'
import { auth } from './auth/resource'
import {
    data,
} from './data/resource'
import { createAppSyncEventApi } from './events/resource'
import {
  contentCreator,
  configureContentCreatorFn,
  configureEnvsForContentCreatorFn
} from './functions/content-creator/resource'
import {
  knowledgeBaseIngestionJob,
  configureKnowledgeBaseIngestionJobFn,
  configureEnvsForKnowledgeBaseIngestionJobFn
} from './functions/knowledge-base-ingestion-job/resource'
import {
    agentActionPerformer,
    configureAgentActionPerformerFn
} from './functions/action-performer/resource'
import {
    cdc,
    configureCDCFn,
    configureEnvsForCDCFn
} from './functions/cdc/resource'
import { BedrockAI } from './bedrock/resource'

const backend = defineBackend({
    auth,
    data,
    cdc,
    contentCreator,
    knowledgeBaseIngestionJob,
    agentActionPerformer,
})

const cdcFnResources = backend.cdc.resources
const authResources = backend.auth.resources
const dataResources = backend.data.resources
const contentCreatorFnResources = backend.contentCreator.resources
const knowledgeBaseIngestionJobFnResources = backend.knowledgeBaseIngestionJob.resources
const agentActionPerformerFnResources = backend.agentActionPerformer.resources

const dataStack = Stack.of(dataResources.graphqlApi)
const functionsStack = Stack.of(contentCreatorFnResources.lambda)

const bedrock = new BedrockAI(functionsStack, 'bedrock', {
    actionPerformerFn: agentActionPerformerFnResources.lambda,
})

dataResources.tables['AgentMessage'].grantReadWriteData(cdcFnResources.lambda)

const api = createAppSyncEventApi(
    dataStack,
    'my-event-api',
    authResources.userPool.userPoolId,
    authResources.authenticatedUserIamRole
)

const apiKey = new CfnApiKey(dataStack, 'AppSyncApiKey', {
    apiId: api.attrApiId,
    description: 'API key for AppSync Event API',
})

configureCDCFn(
    dataStack,
    cdcFnResources,
    bedrock.agent.agentArn,
    bedrock.agent.agentId,
    api.attrApiArn,
    dataResources.tables['AgentMessage'].tableStreamArn,
)

configureEnvsForCDCFn(
    cdcFnResources.cfnResources.cfnFunction,
    bedrock.agent.agentId,
    bedrock.agentAliasId,
    `https://${api.getAtt('Dns.Http').toString()}/event`,
    apiKey.attrApiKey
)

configureContentCreatorFn(
    functionsStack,
    bedrock.bucket,
    contentCreatorFnResources.cfnResources.cfnFunction,
    contentCreatorFnResources.lambda.role
)

configureKnowledgeBaseIngestionJobFn(
    functionsStack,
    knowledgeBaseIngestionJobFnResources.cfnResources.cfnFunction,
    knowledgeBaseIngestionJobFnResources.lambda,
    bedrock.knowledgeBase.knowledgeBaseArn,
    bedrock.bucket
)

configureAgentActionPerformerFn(
    agentActionPerformerFnResources.cfnResources.cfnFunction
)

configureEnvsForContentCreatorFn(
    contentCreatorFnResources.cfnResources.cfnFunction,
    bedrock.bucket.bucketName
)

configureEnvsForKnowledgeBaseIngestionJobFn(
    knowledgeBaseIngestionJobFnResources.cfnResources.cfnFunction,
    bedrock.knowledgeBase.knowledgeBaseArn,
    bedrock.knowledgeBase.knowledgeBaseId
)

backend.addOutput({
    custom: {
        events: {
            url: `https://${api.getAtt('Dns.Http').toString()}/event`,
            aws_region: dataStack.region,
            default_authorization_type: AuthorizationType.USER_POOL,
        },
    },
})
