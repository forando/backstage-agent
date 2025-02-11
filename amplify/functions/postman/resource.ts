import { defineFunction } from '@aws-amplify/backend'
import { CfnFunction } from 'aws-cdk-lib/aws-lambda'
import { nameFor } from '$backend/utils'

const FUNCTION_NAME = 'postman'

export const postman = defineFunction({
    name: FUNCTION_NAME,
    entry: "./src/handler.ts",
    timeoutSeconds: 60,
})

export const configureInvokeAgentFn = (cfn: CfnFunction) => {
    cfn.functionName = nameFor(FUNCTION_NAME)
}

export const configureEnvsForInvokeAgentFn = (
    lambda: CfnFunction,
    region: string,
) => {
    lambda.addPropertyOverride('Environment.Variables.AWS_REGION', region)
}