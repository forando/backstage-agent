import { Logger } from '@aws-lambda-powertools/logger'
import type {
  DynamoDBStreamHandler,
  DynamoDBBatchResponse,
  DynamoDBStreamEvent,
  DynamoDBRecord,
  DynamoDBBatchItemFailure
} from 'aws-lambda'
import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
  InvokeAgentCommandInput, InvokeAgentCommandOutput,
  ResponseStream,
} from '@aws-sdk/client-bedrock-agent-runtime'
import { AttributeValue } from 'aws-lambda/trigger/dynamodb-stream'
import { Amplify } from 'aws-amplify'
import { events } from 'aws-amplify/data'

process.env.POWERTOOLS_LOGGER_LOG_EVENT = 'true'

const logger = new Logger({ serviceName: 'cdc-handler' })

const runtimeClient = new BedrockAgentRuntimeClient()

export const handler: DynamoDBStreamHandler = async (event: DynamoDBStreamEvent): Promise<DynamoDBBatchResponse> => {
  logger.logEventIfEnabled(event)

  if(!process.env.AGENT_ID) {
    throw new Error('AGENT_ID environment variable is not set')
  }

  if(!process.env.AGENT_ALIAS_ID) {
    throw new Error('AGENT_ALIAS_ID environment variable is not set')
  }

  if(!process.env.EVENT_API_ENDPOINT) {
    throw new Error('EVENT_API_ENDPOINT environment variable is not set')
  }

  if(!process.env.EVENT_API_KEY) {
    throw new Error('EVENT_API_KEY environment variable is not set')
  }

  Amplify.configure({
    API: {
      Events: {
        endpoint: process.env.EVENT_API_ENDPOINT,
        region: process.env.AWS_REGION,
        defaultAuthMode: 'apiKey',
        apiKey: process.env.EVENT_API_KEY
      }
    }
  })

  const batchItemFailures: DynamoDBBatchItemFailure[] = []

  const region = process.env.AWS_REGION
  if (!region) {
    logger.error('AWS_REGION env not defined', { env: process.env })
    return buildBatchItemFailedResponse(event.Records)
  }

  for (const record of event.Records) {
    try {
      const arn = record.eventSourceARN
      if(!arn) {
        logger.error('eventSourceARN not defined', { record })
        batchItemFailures.push({ itemIdentifier: record.eventID! })
        continue
      }
      const tableName = parseTableName(arn)

      if(record.eventName !== 'INSERT') {
        continue
      }

      const id = parsePartitionKey(record.dynamodb?.Keys)
      const question = parseQuestion(record.dynamodb?.NewImage)
      const sessionId = parseSessionId(record.dynamodb?.NewImage)
      const memoryId = parseMemoryId(record.dynamodb?.NewImage)

      const params: InvokeAgentCommandInput = {
        agentId: process.env.AGENT_ID,
        agentAliasId: process.env.AGENT_ALIAS_ID,
        sessionId,
        memoryId,
        inputText: question
      }

      const command = new InvokeAgentCommand(params)
      const response: InvokeAgentCommandOutput = await runtimeClient.send(command)

      if (!response.completion) {
        logger.error('agent response is empty', { response })
        continue
      }

      const answer = await streamToString(response.completion)

      await events.connect('default/channel')
      await events.post('default/channel', { id, question, answer, sessionId })
      logger.info('saved answer', { id, answer })

    } catch (err) {
      logger.error('cannot process record', { record, error: err as Error })
      batchItemFailures.push({ itemIdentifier: record.eventID! })
    }
  }

  return { batchItemFailures }
}

const streamToString = async (stream: AsyncIterable<ResponseStream>): Promise<string> => {
  let result = ''

  for await (const chunk of stream) {
    if (chunk.chunk?.bytes) {
      // Convert the Uint8Array to string
      result += new TextDecoder().decode(chunk.chunk.bytes)
    }
  }

  return result
}

const parseTableName = (arn: string): string => {
  return arn.split('/')[1]
}

const buildBatchItemFailedResponse = (records: DynamoDBRecord[]): DynamoDBBatchResponse => {
  const batchItemFailures = records.map((record) => {
    return { itemIdentifier: record.eventID! }
  })

  return { batchItemFailures }
}

export const parsePartitionKey = (keys?: {[p: string]: AttributeValue}): string => {

  if (!keys) {
    throw new Error('keys is not set')
  }
  if (!keys.id || !keys.id.S) {
    throw new Error('id is not set')
  }

  return keys.id.S
}

export const parseQuestion = (newImage?: { [key: string]: AttributeValue }): string => {

  if (!newImage) {
    throw new Error('newImage is not set')
  }
  if (!newImage.question || !newImage.question.S) {
    throw new Error('question is not set')
  }

  return newImage.question.S
}

export const parseSessionId = (newImage?: { [key: string]: AttributeValue }): string => {

  if (!newImage) {
    throw new Error('newImage is not set')
  }
  if (!newImage.sessionId || !newImage.sessionId.S) {
    throw new Error('sessionId is not set')
  }

  return newImage.sessionId.S
}

export const parseMemoryId = (newImage?: { [key: string]: AttributeValue }): string | undefined => {

  if (!newImage) {
    throw new Error('newImage is not set')
  }
  if (!newImage.memoryId || !newImage.sessionId.S) {
    return undefined
  }

  return newImage.sessionId.S
}
