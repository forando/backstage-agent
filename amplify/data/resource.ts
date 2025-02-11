import { type ClientSchema, a, defineData } from '@aws-amplify/backend'


const schema = a.schema({
  AgentMessage: a.model({
    id: a.id().required(),
    sessionId: a.string().required(),
    question: a.string().required(),
    session: a.belongsTo('ChatSession', 'sessionId'),
    answer: a.string(),
    memoryId: a.string(),
  })
      .authorization((allow) => [allow.authenticated()]),
  ChatSession: a.model({
    id: a.id().required(),
    messages: a.hasMany('AgentMessage', 'sessionId')
  })
      .authorization((allow) => [allow.authenticated()]),
})

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    /*apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },*/
  },
})
