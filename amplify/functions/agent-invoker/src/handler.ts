import type { Schema } from '../../../data/resource'

import {
    BedrockAgentRuntimeClient,
    InvokeAgentCommand,
    InvokeAgentCommandInput, InvokeAgentCommandOutput,
    ResponseStream,
} from '@aws-sdk/client-bedrock-agent-runtime'

// initialize bedrock runtime client
const runtimeClient = new BedrockAgentRuntimeClient()

export const handler: Schema["invokeAgent"]["functionHandler"] = async (event: any) => {

    if(!process.env.AGENT_ID) {
        throw new Error('AGENT_ID environment variable is not set')
    }

    if(!process.env.AGENT_ALIAS_ID) {
        throw new Error('AGENT_ALIAS_ID environment variable is not set')
    }

    // User prompt
    const prompt: string = event.arguments.prompt
    const sessionId: string = event.arguments.sessionId
    const memoryId: string = event.arguments.memoryId

    const params: InvokeAgentCommandInput = {
        agentId: process.env.AGENT_ID,
        agentAliasId: process.env.AGENT_ALIAS_ID,
        sessionId,
        memoryId,
        inputText: prompt
    }

    const command = new InvokeAgentCommand(params)
    const response: InvokeAgentCommandOutput = await runtimeClient.send(command)

    if (!response.completion) {
        return { answer: null, memoryId: response.memoryId };
    }

    const answer = await streamToString(response.completion)

    return { answer, memoryId: response.memoryId}
}

async function streamToString(stream: AsyncIterable<ResponseStream>): Promise<string> {
    let result = '';

    for await (const chunk of stream) {
        if (chunk.chunk?.bytes) {
            // Convert the Uint8Array to string
            result += new TextDecoder().decode(chunk.chunk.bytes);
        }
    }

    return result;
}