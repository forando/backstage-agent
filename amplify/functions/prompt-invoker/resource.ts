import { Stack } from 'aws-cdk-lib'
import { defineFunction } from '@aws-amplify/backend'
import { BedrockFoundationModel } from '@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock/models'
import { Effect, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam'
import { FunctionResources } from '@aws-amplify/plugin-types/lib/function_resources'
import { nameFor } from '../../utils'
import {CfnFunction} from 'aws-cdk-lib/aws-lambda'
import * as iam from 'aws-cdk-lib/aws-iam'

const FUNCTION_NAME = 'promptInvoker'

export const promptInvoker = defineFunction({
    name: FUNCTION_NAME,
    entry: "./src/handler.ts",
    timeoutSeconds: 30,
    resourceGroupName: 'data',
    environment: {
        MODEL_ID: BedrockFoundationModel.ANTHROPIC_CLAUDE_3_5_SONNET_V1_0.modelId,
    }
})

export const configurePromptInvokerFn = (
    stack: Stack,
    resources: FunctionResources,
    promptArn: string,
    promptVersionArn: string,
) => {
    resources.cfnResources.cfnFunction.functionName = nameFor(FUNCTION_NAME)

    const bedrockModelAccess = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["bedrock:InvokeModel"],
        resources: [BedrockFoundationModel.ANTHROPIC_CLAUDE_3_5_SONNET_V1_0.modelArn],
    })

    const usePrompt = new iam.PolicyStatement({
        sid: 'UsePrompt',
        effect: iam.Effect.ALLOW,
        actions: ["bedrock:RenderPrompt"],
        resources: [promptArn, promptVersionArn],
    })

    const policy: Policy = new Policy(stack, 'ModelInvoker', {
        statements: [bedrockModelAccess, usePrompt],
    })
    resources.lambda.role?.attachInlinePolicy(policy)
}

export const configureEnvsForPromptInvokerFn = (
    lambda: CfnFunction,
    promptVersionArn: string
) => {
    lambda.addPropertyOverride('Environment.Variables.PROMPT_VERSION_ARN', promptVersionArn)
}