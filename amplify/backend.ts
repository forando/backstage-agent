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
    agentAliasCr,
    configureAgentAliasCrFn
} from './functions/agent-alias-cr/resource'
import { BedrockAI, BedrockAgentAlias } from './bedrock/resource'

const backend = defineBackend({
  data,
  agentInvoker,
  contentCreator,
  knowledgeBaseIngestionJob,
  agentAliasCr
})

const agentInvokerFnResources = backend.agentInvoker.resources
const contentCreatorFnResources = backend.contentCreator.resources
const knowledgeBaseIngestionJobFnResources = backend.knowledgeBaseIngestionJob.resources
const agentAliasCrFnResources = backend.agentAliasCr.resources

const functionsStack = Stack.of(contentCreatorFnResources.lambda)


const aiStack = backend.createStack("ai")
const ai = new BedrockAI(aiStack, 'ai')

new BedrockAgentAlias(aiStack, 'agentAlias', {
    agentId: ai.agent.agentId,
    agentAliasCrFn: agentAliasCrFnResources.lambda
})

configureInvokeAgentFn(
    functionsStack,
    ai.agent.agentArn,
    ai.agent.agentId,
    agentInvokerFnResources.cfnResources.cfnFunction,
    agentInvokerFnResources.lambda.role
)

configureContentCreatorFn(
    functionsStack,
    ai.bucket,
    contentCreatorFnResources.cfnResources.cfnFunction,
    contentCreatorFnResources.lambda.role
)

configureEnvsForInvokeAgentFn(agentInvokerFnResources.cfnResources.cfnFunction, ai.agent.agentId)
configureEnvsForContentCreatorFn(contentCreatorFnResources.cfnResources.cfnFunction, ai.bucket.bucketName)
configureAgentAliasCrFn(functionsStack, agentAliasCrFnResources.cfnResources.cfnFunction, agentAliasCrFnResources.lambda.role)

configureKnowledgeBaseIngestionJobFn(
    functionsStack,
    knowledgeBaseIngestionJobFnResources.cfnResources.cfnFunction,
    knowledgeBaseIngestionJobFnResources.lambda,
    ai.knowledgeBase.knowledgeBaseArn,
    ai.bucket
)

configureEnvsForKnowledgeBaseIngestionJobFn(
    knowledgeBaseIngestionJobFnResources.cfnResources.cfnFunction,
    ai.knowledgeBase.knowledgeBaseArn,
    ai.knowledgeBase.knowledgeBaseId
)

