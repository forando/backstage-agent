import { Handler } from 'aws-lambda'
import { Logger } from '@aws-lambda-powertools/logger'
import { AgentActionEvent, AgentActionResponse } from '$backend/functions/action-performer/src/agent-action'

process.env.POWERTOOLS_LOGGER_LOG_EVENT = 'true'
const logger = new Logger({ serviceName: 'githubAgentActionPerformer' })

export const handler: Handler = async (event: AgentActionEvent): Promise<AgentActionResponse> => {
    logger.logEventIfEnabled(event)

    switch (event.function) {
        case 'createGithubApp':
            return createGitHubApp(event)
        default:
            return buildResponse(event, { error: 'Unknown function' })
    }
}

const createGitHubApp = (event: AgentActionEvent): AgentActionResponse => {
    const teamName = event.parameters.find(param => param.name === 'teamName')?.value

    if(!teamName) {
        return buildResponse(event, { error: 'No teamName provided' })
    }
    return buildResponse(event, { teamName, requestId: Date.now() })
}

const buildResponse = (event: AgentActionEvent, response: any): AgentActionResponse => {
    const responseBody = {
        TEXT: {
            body: JSON.stringify(response)
        }
    }

    return {
        messageVersion: event.messageVersion,
        response: {
            actionGroup: event.actionGroup,
            function: event.function,
            functionResponse: {
                responseBody
            }
        },
        sessionAttributes: event.sessionAttributes,
        promptSessionAttributes: event.promptSessionAttributes
    }
}