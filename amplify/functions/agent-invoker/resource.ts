import {defineFunction} from '@aws-amplify/backend'
import {BedrockFoundationModel} from '@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock/models'
import {Construct} from 'constructs'
import {CfnFunction} from 'aws-cdk-lib/aws-lambda'
import {Effect, IRole, Policy, PolicyStatement} from 'aws-cdk-lib/aws-iam'
import {nameFor} from '../../utils'

const FUNCTION_NAME = 'agentInvoker'

export const agentInvoker = defineFunction({
    entry: "./src/handler.ts",
    timeoutSeconds: 30,
})

export const configureInvokeAgentFn = (scope: Construct, agentArn: string, agentId: string, cfn: CfnFunction, role?: IRole) => {
    cfn.functionName = nameFor(FUNCTION_NAME)

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
            `arn:aws:bedrock:eu-central-1:187437750615:agent-alias/${agentId}/*`
        ],
    })

    const agentAliasListAccess = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['bedrock:ListAgentAliases'],
        resources: ['*']
    })

    const policy: Policy = new Policy(scope, 'AgentInvoker', {
        statements: [bedrockModelAccess, bedrockAgentAccess, agentAliasListAccess],
    })
    role?.attachInlinePolicy(policy)
}

export const configureEnvsForInvokeAgentFn = (
    lambda: CfnFunction,
    agentId: string
) => {
    lambda.addPropertyOverride('Environment.Variables.AGENT_ID', agentId)
}