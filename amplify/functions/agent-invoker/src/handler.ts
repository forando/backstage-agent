import type { Schema } from '../../../data/resource'

import {
    BedrockAgentRuntimeClient,
    InvokeAgentCommand,
    InvokeAgentCommandInput, InvokeAgentCommandOutput,
    ResponseStream,
} from '@aws-sdk/client-bedrock-agent-runtime'

import {
    BedrockAgentClient,
    ListAgentAliasesCommand,
    ListAgentAliasesCommandInput,
} from '@aws-sdk/client-bedrock-agent'

// initialize bedrock runtime client
const runtimeClient = new BedrockAgentRuntimeClient()
const bedrockClient = new BedrockAgentClient()

export const handler: Schema["invokeAgent"]["functionHandler"] = async (event: any) => {

    if(!process.env.AGENT_ID) {
        throw new Error('AGENT_ID environment variable is not set')
    }

    const listInput: ListAgentAliasesCommandInput = {
        agentId: process.env.AGENT_ID,
        maxResults: 100
    }

    const listResponse = await bedrockClient.send(new ListAgentAliasesCommand(listInput))

    const aliasSummary = listResponse.agentAliasSummaries?.find(alias => alias.agentAliasName === 'test')
    if(!aliasSummary) {
        throw new Error('Agent alias not found')
    }

    // User prompt
    const prompt: string = event.arguments.prompt
    const sessionId: string = event.arguments.sessionId
    const memoryId: string = event.arguments.memoryId

    const params: InvokeAgentCommandInput = {
        agentId: process.env.AGENT_ID,
        agentAliasId: aliasSummary.agentAliasId,
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