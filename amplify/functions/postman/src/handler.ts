import { v4 as uuidv4 } from 'uuid'
import { Logger } from '@aws-lambda-powertools/logger'
import {getEntity} from '$common/dynamodb-actions'
import {PostmanRequest, PostmanRequestAsk, PostmanRequestGetAnswer, PostmanRequestType} from '$common/postman-request'
import { AgentMessage } from '$common/message'
import { GetEntityOutput } from '$common/dynamodb-entity'

process.env.POWERTOOLS_LOGGER_LOG_EVENT = 'true'

const logger = new Logger({ serviceName: 'postman' })

export const handler = async (request: PostmanRequest): Promise<AgentMessage> => {
    logger.logEventIfEnabled(request)

    if(!process.env.TABLE_NAME) {
        throw new Error('TABLE_NAME environment variable is not set')
    }

    const tableName = process.env.TABLE_NAME

    switch (request.requestType) {
        case PostmanRequestType.ASK:
            return await ask(request, tableName)
        case PostmanRequestType.GET_ANSWER:
            return await getAnswer(request, tableName)
    }
}

const ask = async (request: PostmanRequestAsk, tableName: string): Promise<AgentMessage> => {
    const id = uuidv4()

    return {
        id,
        question: request.message.question,
        sessionId: request.message.sessionId,
        memoryId: request.message.memoryId,
    }
}

const getAnswer = async (request: PostmanRequestGetAnswer, tableName: string): Promise<AgentMessage> => {
    const data: GetEntityOutput<AgentMessage> = await getEntity(tableName, request.messageId)
    if (!data.Item) {
        throw new Error('Message not found')
    }
    return data.Item
}