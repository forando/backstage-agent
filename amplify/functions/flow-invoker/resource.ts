import { Stack } from 'aws-cdk-lib'
import { defineFunction } from '@aws-amplify/backend'
import { BedrockFoundationModel } from '@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock/models'
import { CfnFunction } from 'aws-cdk-lib/aws-lambda'
import { Effect, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam'
import { FunctionResources } from '@aws-amplify/plugin-types/lib/function_resources'
import { nameFor } from '../../utils'

const FUNCTION_NAME = 'flowInvoker'

export const flowInvoker = defineFunction({
    name: FUNCTION_NAME,
    entry: "./src/handler.ts",
    timeoutSeconds: 60,
    resourceGroupName: 'data'
})

export const configureFlowInvokerFn = (
    stack: Stack,
    resources: FunctionResources,
    flowArn: string,
    flowAliasArn: string,
    eventApiArn: string,
) => {
    resources.cfnResources.cfnFunction.functionName = nameFor(FUNCTION_NAME)

    const bedrockFlowAccess = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["bedrock:InvokeFlow"],
        resources: [flowArn, flowAliasArn],
    })

    const flowAliasListAccess = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['bedrock:ListFlowAliases'],
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

    const policy: Policy = new Policy(stack, 'FlowInvoker', {
        statements: [
            bedrockFlowAccess,
            flowAliasListAccess,
            eventApiAccess
        ],
    })
    resources.lambda.role?.attachInlinePolicy(policy)
}

export const configureEnvsForFlowInvokerFn = (
    lambda: CfnFunction,
    flowId: string,
    flowAliasId: string,
    eventApiEndpoint: string,
    apiKey: string,
) => {
    lambda.addPropertyOverride('Environment.Variables.FLOW_ID', flowId)
    lambda.addPropertyOverride('Environment.Variables.FLOW_ALIAS_ID', flowAliasId)
    lambda.addPropertyOverride('Environment.Variables.EVENT_API_ENDPOINT', eventApiEndpoint)
    lambda.addPropertyOverride('Environment.Variables.EVENT_API_KEY', apiKey)
}