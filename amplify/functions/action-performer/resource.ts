import {defineFunction} from '@aws-amplify/backend'
import {CfnFunction} from 'aws-cdk-lib/aws-lambda'
import {nameFor} from '../../utils'

const FUNCTION_NAME = 'agentActionPerformer'

export const agentActionPerformer = defineFunction({
    name: FUNCTION_NAME,
    entry: "./src/handler.ts",
    timeoutSeconds: 30,
})

export const configureAgentActionPerformerFn = (cfn: CfnFunction) => {
    cfn.functionName = nameFor(FUNCTION_NAME)
}