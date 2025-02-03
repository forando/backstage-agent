import {defineFunction} from '@aws-amplify/backend'
import {Construct} from 'constructs'
import {CfnFunction} from 'aws-cdk-lib/aws-lambda'
import {Effect, IRole, Policy, PolicyStatement} from 'aws-cdk-lib/aws-iam'
import {nameFor} from '../../utils'

const FUNCTION_NAME = 'agentAliasCustomResource'

export const agentAliasCr = defineFunction({
    entry: "./src/alias-custom-resource.ts",
    timeoutSeconds: 30,
})

export const configureAgentAliasCrFn = (scope: Construct, cfn: CfnFunction, role?: IRole) => {
    cfn.functionName = nameFor(FUNCTION_NAME)

    const agentAliasListAccess = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['bedrock:ListAgentAliases', 'bedrock:CreateAgentAlias', 'bedrock:DeleteAgentAlias'],
        resources: ['*']
    })

    const policy: Policy = new Policy(scope, 'AgentAliasCustomResource', {
        statements: [agentAliasListAccess],
    })
    role?.attachInlinePolicy(policy)
}