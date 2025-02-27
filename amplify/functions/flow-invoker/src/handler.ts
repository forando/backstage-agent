import {
    BedrockAgentRuntimeClient,
    FlowResponseStream,
    InvokeFlowCommand,
    InvokeFlowCommandInput,
    InvokeFlowCommandOutput
} from '@aws-sdk/client-bedrock-agent-runtime'
import { Logger } from '@aws-lambda-powertools/logger'
import { FlowMessage } from '$common/message'
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

        const flowParams: InvokeFlowCommandInput = {
            flowIdentifier: process.env.FLOW_ID,
            flowAliasIdentifier: process.env.FLOW_ALIAS_ID,
            executionId: event.arguments.executionId,
            inputs: [...JSON.parse(event.arguments.question)],
            enableTrace: true
        }

        const command = new InvokeFlowCommand(flowParams)
        const response: InvokeFlowCommandOutput = await runtimeClient.send(command)

        logger.info('response', { response })

        const result: FlowMessage = await processFlowResponse(
            event.arguments.id,
            event.arguments.sessionId,
            response.executionId,
            response.responseStream
        )

        await send(result)

        logger.info('sent', { data: result })
    } catch (error) {
        logger.error('error', { error })
    }
}

const processFlowResponse = async (
    id: string,
    sessionId: string,
    executionId?: string,
    stream?: AsyncIterable<FlowResponseStream>
): Promise<FlowMessage> => {
    let result: FlowMessage = {
        id,
        sessionId,
        executionId,
        agentNode: ''
    };

    if(!stream) {
        return result
    }

    for await (const chunk of stream) {
        logger.info('chunk', { chunk })
        if(chunk.flowOutputEvent) {
            result.answer = chunk.flowOutputEvent.content?.document?.toString()
            result.agentNode = chunk.flowOutputEvent.nodeName!
        }
        if(chunk.flowMultiTurnInputRequestEvent) {
            result.followupQuestion = chunk.flowMultiTurnInputRequestEvent.content?.document?.toString()
            result.agentNode = chunk.flowMultiTurnInputRequestEvent.nodeName!
        }
    }

    return result;
}

const send = async (message: FlowMessage) => {
    const channel = await events.connect('default/channel')
    await events.post('default/channel', message)
    channel.close()
}