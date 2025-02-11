import { type ClientSchema, a, defineData } from '@aws-amplify/backend'
import { agentInvoker } from '../functions/agent-invoker/resource'

const schema = a.schema({
  invokeAgent: a
      .query()
      .arguments({ id: a.string().required(), question: a.string().required(), sessionId: a.string().required(), memoryId: a.string() })
      .handler(a.handler.function(agentInvoker).async())
      .authorization((allow) => [allow.authenticated()])
})

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
})
