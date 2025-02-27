import { type ClientSchema, a, defineData } from '@aws-amplify/backend'
import { promptInvoker } from '../functions/prompt-invoker/resource'
import { agentInvoker } from '../functions/agent-invoker/resource'
import { flowInvoker } from '../functions/flow-invoker/resource'

const schema = a.schema({
    invokeClassifierPrompt: a
        .query()
        .arguments({ question: a.string().required() })
        .returns(a.string())
        .handler(a.handler.function(promptInvoker))
        .authorization((allow) => [allow.authenticated()]),
    invokeAgent: a
      .query()
      .arguments({
        id: a.string().required(),
        question: a.string().required(),
        sessionId: a.string().required(),
        executionId: a.string(),
        memoryId: a.string()
      })
      .handler(a.handler.function(agentInvoker).async())
      .authorization((allow) => [allow.authenticated()]),
    invokeFlow: a
        .query()
        .arguments({
            id: a.string().required(),
            question: a.string().required(),
            sessionId: a.string().required(),
            executionId: a.string()
        })
        .handler(a.handler.function(flowInvoker).async())
        .authorization((allow) => [allow.authenticated()])
})

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
})
