import { Logger } from '@aws-lambda-powertools/logger'
import type { Schema } from '$backend/data/resource'
import {
    BedrockRuntimeClient,
    InvokeModelCommand,
    InvokeModelCommandInput,
} from '@aws-sdk/client-bedrock-runtime'

const logger = new Logger({ serviceName: 'promptInvoker' })

const client = new BedrockRuntimeClient();

export const handler: Schema["invokeClassifierPrompt"]["functionHandler"] = async (event) => {
    logger.info('event', { event })
    if(!process.env.PROMPT_VERSION_ARN) {
        throw new Error('PROMPT_VERSION_ARN environment variable is not set')
    }

    const question = event.arguments.question

    const input: InvokeModelCommandInput = {
        modelId: process.env.PROMPT_VERSION_ARN,
        contentType: "application/json",
        accept: "application/json",
        body: question
    }

    const command = new InvokeModelCommand(input)

    const response = await client.send(command)

    const data = JSON.parse(Buffer.from(response.body).toString())

    logger.info('response', { data })

    return data.content[0].text;
}