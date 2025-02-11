import { Stack } from 'aws-cdk-lib'
import { defineFunction } from '@aws-amplify/backend'
import { BedrockFoundationModel } from '@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock/models'
import { CfnFunction } from 'aws-cdk-lib/aws-lambda'
import { Effect, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam'
import { FunctionResources } from '@aws-amplify/plugin-types/lib/function_resources'
import { nameFor } from '../../utils'

const FUNCTION_NAME = 'agentInvoker'

export const agentInvoker = defineFunction({
    name: FUNCTION_NAME,
    entry: "./src/handler.ts",
    timeoutSeconds: 60,
    resourceGroupName: 'data'
})

export const configureInvokeAgentFn = (
    stack: Stack,
    resources: FunctionResources,
    agentArn: string,
    agentId: string,
    eventApiArn: string,
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
            'appsync:EventPublish',
        ],
        resources: [
            `${eventApiArn}/*`,
            `${eventApiArn}`
        ],
    })

    const policy: Policy = new Policy(stack, 'AgentInvoker', {
        statements: [bedrockModelAccess, bedrockAgentAccess, agentAliasListAccess, eventApiAccess],
    })
    resources.lambda.role?.attachInlinePolicy(policy)
}

export const configureEnvsForInvokeAgentFn = (
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