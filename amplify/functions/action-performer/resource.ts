import {defineFunction} from '@aws-amplify/backend'
import {CfnFunction} from 'aws-cdk-lib/aws-lambda'
import {nameFor} from '../../utils'

const FUNCTION_NAME = 'agentActionPerformer'

if(!process.env.BACKSTAGE_URL) {
    throw new Error('BACKSTAGE_URL env not defined')
}

export const agentActionPerformer = defineFunction({
    name: FUNCTION_NAME,
    entry: "./src/handler.ts",
    timeoutSeconds: 30,
    environment: {
        BACKSTAGE_URL: process.env.BACKSTAGE_URL
    }
})

export const configureAgentActionPerformerFn = (cfn: CfnFunction) => {
    cfn.functionName = nameFor(FUNCTION_NAME)
}