import { defineFunction } from '@aws-amplify/backend';
import {CfnFunction, EventSourceMapping, StartingPosition} from 'aws-cdk-lib/aws-lambda';
import { nameFor } from '../../utils'
import { Effect, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam'
import { BedrockFoundationModel } from '@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock/models'
import { Stack } from 'aws-cdk-lib'
import { FunctionResources } from '@aws-amplify/plugin-types/lib/function_resources'

const FUNCTION_NAME = 'cdc';

export const cdc = defineFunction({
  name: FUNCTION_NAME,
  entry: './src/handler.ts',
  runtime: 20,
  timeoutSeconds: 60,
  resourceGroupName: 'data'
})

export const configureCDCFn = (
    stack: Stack,
    resources: FunctionResources,
    agentArn: string,
    agentId: string,
    eventApiArn: string,
    tableStreamArn?: string,
) => {
  resources.cfnResources.cfnFunction.functionName = nameFor(FUNCTION_NAME)

  const bedrockModelAccess = new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ["bedrock:InvokeModel"],
    resources: [BedrockFoundationModel.ANTHROPIC_CLAUDE_3_5_SONNET_V1_0.modelArn],
  })

  const bedrockAgentAccess = new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ["bedrock:InvokeAgent"],
    resources: [
      agentArn,
      `arn:aws:bedrock:eu-central-1:${stack.account}:agent-alias/${agentId}/*`
    ],
  })

  const agentAliasListAccess = new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['bedrock:ListAgentAliases'],
    resources: ['*']
  })

  const eventApiAccess = new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      'appsync:EventConnect',
      'appsync:EventSubscribe',
      'appsync:EventPublish',
    ],
    resources: [
      `${eventApiArn}/*`,
      `${eventApiArn}`
    ],
  })

  const dynamoDBAccess = new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      'dynamodb:DescribeStream',
      'dynamodb:GetRecords',
      'dynamodb:GetShardIterator',
      'dynamodb:ListStreams',
    ],
    resources: ['*'],
  })

  const policy: Policy = new Policy(stack, 'AgentInvoker', {
    statements: [
      bedrockModelAccess,
      bedrockAgentAccess,
      agentAliasListAccess,
      eventApiAccess,
      dynamoDBAccess,
    ],
  })
  resources.lambda.role?.attachInlinePolicy(policy)

  const mapping = new EventSourceMapping(
      stack,
      `agent-messages-event-stream-mapping`,
      {
        target: resources.lambda,
        eventSourceArn: tableStreamArn,
        startingPosition: StartingPosition.LATEST,
      },
  )

  mapping.node.addDependency(policy)
}

export const configureEnvsForCDCFn = (
    lambda: CfnFunction,
    agentId: string,
    agentAliasId: string,
    eventApiEndpoint: string,
    apiKey: string,
) => {
  lambda.addPropertyOverride('Environment.Variables.AGENT_ID', agentId)
  lambda.addPropertyOverride('Environment.Variables.AGENT_ALIAS_ID', agentAliasId)
  lambda.addPropertyOverride('Environment.Variables.EVENT_API_ENDPOINT', eventApiEndpoint)
  lambda.addPropertyOverride('Environment.Variables.EVENT_API_KEY', apiKey)
}
