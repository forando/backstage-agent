import {
    CdkCustomResourceEvent,
    CdkCustomResourceHandler,
    CdkCustomResourceResponse,
    Context
} from 'aws-lambda'
import {
    AgentAlias,
    AgentAliasSummary,
    BedrockAgentClient,
    CreateAgentAliasCommand,
    DeleteAgentAliasCommand,
    CreateAgentAliasCommandInput,
    DeleteAgentAliasCommandInput,
    ListAgentAliasesCommand,
    ListAgentAliasesCommandInput,
} from '@aws-sdk/client-bedrock-agent'
import {Logger} from '@aws-lambda-powertools/logger'

process.env.POWERTOOLS_LOGGER_LOG_EVENT = 'true'
const logger = new Logger({ serviceName: 'agentAliasCustomResource' })

const bedrockClient = new BedrockAgentClient()

export const handler: CdkCustomResourceHandler = async (
    event: CdkCustomResourceEvent,
    context: Context
): Promise<CdkCustomResourceResponse> => {

    logger.logEventIfEnabled(event)

    const response: CdkCustomResourceResponse = {
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        PhysicalResourceId: context.logGroupName,
    }

    const agentId = event.ResourceProperties.agentId
    const aliasName = event.ResourceProperties.aliasName

    switch (event.RequestType) {
        case "Create":
            return await createAlias(agentId, aliasName, response)
        case "Update":
            return await updateAlias(agentId, aliasName, response)
        case "Delete":
            return await deleteAlias(agentId, aliasName, response)
    }
}

const createAlias = async (agentId: string, aliasName: string, response: CdkCustomResourceResponse): Promise<CdkCustomResourceResponse> => {
    try {
        const existingAlias = await findAlias(agentId, aliasName)
        if(existingAlias) {
            return {
                ...response,
                Status: 'SUCCESS',
                Data: {
                    aliasId: existingAlias.agentAliasId
                }
            }
        }

        const alias = await createAgentAlias(agentId, aliasName)
        return {
            ...response,
            Status: 'SUCCESS',
            Data: {
                aliasId: alias?.agentAliasId
            }
        }
    } catch (error) {
        logger.error('Failed to create agent alias', { error })
        return {
            ...response,
            Status: 'FAILED',
        }
    }
}

const updateAlias = async (agentId: string, aliasName: string, response: CdkCustomResourceResponse): Promise<CdkCustomResourceResponse> => {
    return await createAlias(agentId, aliasName, response)
}

const deleteAlias = async (agentId: string, aliasName: string, response: CdkCustomResourceResponse): Promise<CdkCustomResourceResponse> => {
    try {
        const existingAlias = await findAlias(agentId, aliasName)
        if(existingAlias?.agentAliasId) {
            await deleteAgentAlias(agentId, existingAlias.agentAliasId)
        }

        return {
            ...response,
            Status: 'SUCCESS'
        }
    } catch (error) {
        logger.error('Failed to delete agent alias', { error })
        return {
            ...response,
            Status: 'FAILED'
        }
    }
}

const findAlias = async (agentId: string, aliasName: string): Promise<AgentAliasSummary | undefined> => {
    const listInput: ListAgentAliasesCommandInput = {
        agentId,
        maxResults: 100
    }
    const listResponse = await bedrockClient.send(new ListAgentAliasesCommand(listInput))
    return listResponse.agentAliasSummaries?.find(alias => alias.agentAliasName === aliasName)
}

const createAgentAlias = async (agentId: string, aliasName: string): Promise<AgentAlias | undefined> => {
    const params: CreateAgentAliasCommandInput = {
        agentId: agentId,
        agentAliasName: aliasName
    }
    const command = new CreateAgentAliasCommand(params)
    const response = await bedrockClient.send(command)
    return response.agentAlias
}

const deleteAgentAlias = async (agentId: string, agentAliasId: string) => {
    const params: DeleteAgentAliasCommandInput = {
        agentId,
        agentAliasId
    }
    const command = new DeleteAgentAliasCommand(params)
    await bedrockClient.send(command)
}