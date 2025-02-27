import {defineFunction} from '@aws-amplify/backend'
import {CfnFunction} from 'aws-cdk-lib/aws-lambda'
import {nameFor} from '../../utils'

const GITHUB_FUNCTION_NAME = 'githubPerformer'
const BACKSTAGE_FUNCTION_NAME = 'backstagePerformer'

export const githubAgentActionPerformer = defineFunction({
    name: GITHUB_FUNCTION_NAME,
    entry: "./src/github-handler.ts",
    timeoutSeconds: 30,
})

export const backstageAgentActionPerformer = defineFunction({
    name: BACKSTAGE_FUNCTION_NAME,
    entry: "./src/backstage-handler.ts",
    timeoutSeconds: 30,
})

export const configureGitHubAgentActionPerformerFn = (cfn: CfnFunction) => {
    cfn.functionName = nameFor(GITHUB_FUNCTION_NAME)
}

export const configureBackstageAgentActionPerformerFn = (cfn: CfnFunction) => {
    cfn.functionName = nameFor(BACKSTAGE_FUNCTION_NAME)
}