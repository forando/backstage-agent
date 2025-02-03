import {
    BedrockAgentClient,
    StartIngestionJobCommand,
} from '@aws-sdk/client-bedrock-agent'

const client = new BedrockAgentClient({ region: process.env.AWS_REGION })

export const handler = async (event: any, context: any) => {
    const command = new StartIngestionJobCommand({
        knowledgeBaseId: process.env.KNOWLEDGE_BASE_ID,
        dataSourceId: process.env.DATA_SOURCE_ID,
        clientToken: context.awsRequestId,
    })

    const response = await client.send(command)

    return JSON.stringify({
        ingestionJob: response.ingestionJob,
    })
};