import {
    BedrockAgentRuntimeClient,
    InvokeAgentCommand,
    InvokeAgentCommandInput,
    InvokeAgentCommandOutput,
    ResponseStream,
} from '@aws-sdk/client-bedrock-agent-runtime'
import { Logger } from '@aws-lambda-powertools/logger'
import { AgentMessage } from '$common/message'
import type { Schema } from '$backend/data/resource'
import { Amplify } from 'aws-amplify'
import { events } from 'aws-amplify/data'
import WebSocket from 'ws'

//@ts-ignore
global.WebSocket = WebSocket // polyfill for WebSocket in nodejs

const logger = new Logger({ serviceName: 'agentInvoker' })

// initialize bedrock runtime client
const runtimeClient = new BedrockAgentRuntimeClient()

export const handler: Schema["invokeAgent"]["functionHandler"] = async (event: any): Promise<void> => {

    if(!process.env.AGENT_ID) {
        throw new Error('AGENT_ID environment variable is not set')
    }

    if(!process.env.AGENT_ALIAS_ID) {
        throw new Error('AGENT_ALIAS_ID environment variable is not set')
    }

    if(!process.env.FLOW_ID) {
        throw new Error('FLOW_ID environment variable is not set')
    }

    if(!process.env.FLOW_ALIAS_ID) {
        throw new Error('FLOW_ALIAS_ID environment variable is not set')
    }

    if(!process.env.EVENT_API_ENDPOINT) {
        throw new Error('EVENT_API_ENDPOINT environment variable is not set')
    }

    if(!process.env.EVENT_API_KEY) {
        throw new Error('EVENT_API_KEY environment variable is not set')
    }

    try {
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

        const params: InvokeAgentCommandInput = {
            agentId: process.env.AGENT_ID,
            agentAliasId: process.env.AGENT_ALIAS_ID,
            sessionId: event.arguments.sessionId,
            memoryId: event.arguments.memoryId,
            inputText: event.arguments.question
        }

        const command = new InvokeAgentCommand(params)
        const response: InvokeAgentCommandOutput = await runtimeClient.send(command)

        if (!response.completion) {
            logger.error('No completion found in response')
            return
        }
        const answer = await streamToString(response.completion)
        const message: AgentMessage = {
            id: event.arguments.id,
            question: event.arguments.question,
            answer: answer,
            sessionId: event.arguments.sessionId,
            memoryId: event.arguments.memoryId
        }

        await send(message)

        logger.info('sent', { data: message })
    } catch (error) {
        logger.error('error', { error })
    }
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

const send = async (message: any) => {
    const channel = await events.connect('default/channel')
    await events.post('default/channel', message)
    channel.close()
}