import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { agentInvoker } from '../functions/agent-invoker/resource';


const schema = a.schema({
  AgentAnswer: a.customType({
    answer: a.string(),
    memoryId: a.string(),
  }),
  invokeAgent: a
      .query()
      .arguments({ prompt: a.string().required(), sessionId: a.string().required(), memoryId: a.string() })
      .returns(a.ref("AgentAnswer"))
      .authorization((allow) => [allow.publicApiKey()])
      .handler(a.handler.function(agentInvoker)),
})

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
})
