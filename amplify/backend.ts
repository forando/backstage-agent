import { Stack } from 'aws-cdk-lib'
import { defineBackend } from '@aws-amplify/backend'
import {
    data,
} from './data/resource'
import {
    agentInvoker,
    configureInvokeAgentFn,
    configureEnvsForInvokeAgentFn
} from './functions/agent-invoker/resource'
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
import { BedrockAI } from './bedrock/resource'

const backend = defineBackend({
  data,
  agentInvoker,
  contentCreator,
  knowledgeBaseIngestionJob,
  agentActionPerformer,
})

const agentInvokerFnResources = backend.agentInvoker.resources
const contentCreatorFnResources = backend.contentCreator.resources
const knowledgeBaseIngestionJobFnResources = backend.knowledgeBaseIngestionJob.resources
const agentActionPerformerFnResources = backend.agentActionPerformer.resources

const functionsStack = Stack.of(contentCreatorFnResources.lambda)

const bedrock = new BedrockAI(functionsStack, 'bedrock', {
    actionPerformerFn: agentActionPerformerFnResources.lambda,
})

configureInvokeAgentFn(
    functionsStack,
    bedrock.agent.agentArn,
    bedrock.agent.agentId,
    agentInvokerFnResources.cfnResources.cfnFunction,
    agentInvokerFnResources.lambda.role
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

configureEnvsForInvokeAgentFn(
    agentInvokerFnResources.cfnResources.cfnFunction,
    bedrock.agent.agentId,
    bedrock.agentAliasId
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

