import { Stack } from 'aws-cdk-lib'
import { AuthorizationType } from 'aws-cdk-lib/aws-appsync'
import { defineBackend } from '@aws-amplify/backend'
import { CfnApiKey } from 'aws-cdk-lib/aws-appsync'
import { auth } from './auth/resource'
import { data } from './data/resource'
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
    promptInvoker,
    configurePromptInvokerFn,
    configureEnvsForPromptInvokerFn
} from './functions/prompt-invoker/resource'
import {
    githubAgentActionPerformer,
    backstageAgentActionPerformer,
    configureGitHubAgentActionPerformerFn,
    configureBackstageAgentActionPerformerFn,
} from './functions/action-performer/resource'
import {
    agentInvoker,
    configureInvokeAgentFn,
    configureEnvsForInvokeAgentFn
} from './functions/agent-invoker/resource'
import { BedrockAI } from './bedrock/resource'

const backend = defineBackend({
    auth,
    data,
    promptInvoker,
    agentInvoker,
    contentCreator,
    githubAgentActionPerformer,
    backstageAgentActionPerformer,
    // knowledgeBaseIngestionJob,
})

const authResources = backend.auth.resources
const dataResources = backend.data.resources
const promptInvokerFnResources = backend.promptInvoker.resources
const agentInvokerFnResources = backend.agentInvoker.resources
const contentCreatorFnResources = backend.contentCreator.resources
const githubAgentActionPerformerFnResources = backend.githubAgentActionPerformer.resources
const backstageAgentActionPerformerFnResources = backend.backstageAgentActionPerformer.resources
// const knowledgeBaseIngestionJobFnResources = backend.knowledgeBaseIngestionJob.resources

const dataStack = Stack.of(dataResources.graphqlApi)
const functionsStack = Stack.of(contentCreatorFnResources.lambda)

const bedrock = new BedrockAI(functionsStack, 'bedrock', {
    githubActionPerformerFn: githubAgentActionPerformerFnResources.lambda,
    backstageActionPerformerFn: backstageAgentActionPerformerFnResources.lambda,
})

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

configurePromptInvokerFn(
    dataStack,
    promptInvokerFnResources,
    bedrock.prompt.promptArn,
    bedrock.promptVersion.versionArn
)

configureInvokeAgentFn(
    dataStack,
    agentInvokerFnResources,
    bedrock.backstageAgent.agentArn,
    bedrock.backstageAgent.agentId,
    bedrock.githubAgent.agentArn,
    bedrock.githubAgent.agentId,
    api.attrApiArn,
)

configureEnvsForPromptInvokerFn(
    promptInvokerFnResources.cfnResources.cfnFunction,
    bedrock.promptVersion.versionArn
)

configureEnvsForInvokeAgentFn(
    agentInvokerFnResources.cfnResources.cfnFunction,
    bedrock.backstageAgent.agentId,
    bedrock.backstageAgentAlias.aliasId,
    bedrock.flow.attrId,
    bedrock.flowAlias.attrId,
    `https://${api.getAtt('Dns.Http').toString()}/event`,
    apiKey.attrApiKey
)

configureContentCreatorFn(
    functionsStack,
    bedrock.backstageBucket,
    contentCreatorFnResources.cfnResources.cfnFunction,
    contentCreatorFnResources.lambda.role
)

/*configureKnowledgeBaseIngestionJobFn(
    functionsStack,
    knowledgeBaseIngestionJobFnResources.cfnResources.cfnFunction,
    knowledgeBaseIngestionJobFnResources.lambda,
    bedrock.knowledgeBase.knowledgeBaseArn,
    bedrock.bucket
)*/

configureGitHubAgentActionPerformerFn(
    githubAgentActionPerformerFnResources.cfnResources.cfnFunction
)

configureBackstageAgentActionPerformerFn(
    backstageAgentActionPerformerFnResources.cfnResources.cfnFunction
)

configureEnvsForContentCreatorFn(
    contentCreatorFnResources.cfnResources.cfnFunction,
    bedrock.backstageBucket.bucketName
)

/*configureEnvsForKnowledgeBaseIngestionJobFn(
    knowledgeBaseIngestionJobFnResources.cfnResources.cfnFunction,
    bedrock.knowledgeBase.knowledgeBaseArn,
    bedrock.knowledgeBase.knowledgeBaseId
)*/

backend.addOutput({
    custom: {
        events: {
            url: `https://${api.getAtt('Dns.Http').toString()}/event`,
            aws_region: dataStack.region,
            default_authorization_type: AuthorizationType.USER_POOL,
        },
    },
})
