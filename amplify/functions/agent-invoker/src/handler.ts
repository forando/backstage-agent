import {
    BedrockAgentRuntimeClient,
    InvokeAgentCommand,
    InvokeAgentCommandInput, InvokeAgentCommandOutput,
    ResponseStream,
} from '@aws-sdk/client-bedrock-agent-runtime'
import {Logger} from '@aws-lambda-powertools/logger'

import { GetEntityOutput } from '$common/dynamodb-entity'
import {AgentMessage} from '$common/message'
import {getEntity, writeUpdate} from '$common/dynamodb-actions'

const logger = new Logger({ serviceName: 'agentInvoker' })

// initialize bedrock runtime client
const runtimeClient = new BedrockAgentRuntimeClient()

export const handler = async (event: any): Promise<void> => {

    if(!process.env.AGENT_ID) {
        throw new Error('AGENT_ID environment variable is not set')
    }

    if(!process.env.AGENT_ALIAS_ID) {
        throw new Error('AGENT_ALIAS_ID environment variable is not set')
    }

    if(!process.env.TABLE_NAME) {
        throw new Error('TABLE_NAME environment variable is not set')
    }

    const message = await getMessage(process.env.TABLE_NAME, event.arguments.messageId)

    const params: InvokeAgentCommandInput = {
        agentId: process.env.AGENT_ID,
        agentAliasId: process.env.AGENT_ALIAS_ID,
        sessionId: message.sessionId,
        memoryId: message.memoryId,
        inputText: message.question
    }

    const command = new InvokeAgentCommand(params)
    const response: InvokeAgentCommandOutput = await runtimeClient.send(command)

    if (!response.completion) {
        logger.error('No completion found in response')
        return
    }

    const answer = await streamToString(response.completion)

    await save(message.id, answer, process.env.TABLE_NAME)
}

const streamToString = async (stream: AsyncIterable<ResponseStream>): Promise<string> => {
    let result = '';

    for await (const chunk of stream) {
        if (chunk.chunk?.bytes) {
            // Convert the Uint8Array to string
            result += new TextDecoder().decode(chunk.chunk.bytes);
        }
    }

    return result;
}

const getMessage = async (tableName: string, messageId: string): Promise<AgentMessage> => {
    const data: GetEntityOutput<AgentMessage> = await getEntity(tableName, messageId)
    if (!data.Item) {
        throw new Error('Message not found')
    }
    return data.Item
}

const save = async (id: string, answer: string, tableName: string) => {
    const params = {
        TableName: tableName,
        Key: { id },
        UpdateExpression: 'SET #answer = :answer',
        ConditionExpression: 'attribute_exists(id)',
        ExpressionAttributeNames: {
            '#answer': 'answer',
        },
        ExpressionAttributeValues: {
            ':answer': answer,
        },
    }
    await writeUpdate(params)
}