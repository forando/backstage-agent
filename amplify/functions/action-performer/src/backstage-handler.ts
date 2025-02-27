import { Handler } from 'aws-lambda'
import { Logger } from '@aws-lambda-powertools/logger'
import { AgentActionEvent, AgentActionResponse } from '$backend/functions/action-performer/src/agent-action'

process.env.POWERTOOLS_LOGGER_LOG_EVENT = 'true'
const logger = new Logger({ serviceName: 'backstageAgentActionPerformer' })

export const handler: Handler = async (event: AgentActionEvent): Promise<AgentActionResponse> => {
    logger.logEventIfEnabled(event)

    switch (event.function) {
        case 'checkBackstageLinkIsValid':
            return checkBackstageLinkIsValid(event)
        case 'createGithubApp':
            return createGitHubApp(event)
        default:
            return buildResponse(event, { error: 'Unknown function' })
    }
}

const checkBackstageLinkIsValid = (event: AgentActionEvent): AgentActionResponse => {
    const link = event.parameters.find(param => param.name === 'link')?.value

    if(!link) {
        return buildResponse(event, { error: 'No link provided' })
    }

    const baseUrl = "https://backstage-stg.idealo.tools/docs"

    return link.startsWith(baseUrl) ? buildResponse(event, { valid: true }) : buildResponse(event, { valid: false })
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