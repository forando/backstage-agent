import { Handler } from 'aws-lambda'
import {Logger} from '@aws-lambda-powertools/logger'

process.env.POWERTOOLS_LOGGER_LOG_EVENT = 'true'
const logger = new Logger({ serviceName: 'agentActionPerformer' })

/**
 * @see https://docs.aws.amazon.com/bedrock/latest/userguide/agents-lambda.html#agents-lambda-input
 */
export interface AgentActionEvent {
    messageVersion: string,
    agent: {
        name: string,
        id: string,
        alias: string,
        version: string
    },
    inputText: string,
    sessionId: string,
    actionGroup: string,
    function: string,
    parameters: [
        {
            name: string,
            type: string,
            value: string
        }
    ],
    sessionAttributes: {
        [key: string]: string
    }
    promptSessionAttributes: {
        [key: string]: string
    }
}

/**
 * @see https://docs.aws.amazon.com/bedrock/latest/userguide/agents-lambda.html#agents-lambda-input
 */
export interface AgentActionResponse {
    messageVersion: string,
    response: {
        actionGroup: string,
        function: string,
        functionResponse: {
            responseState?: "FAILURE | REPROMPT",
            responseBody: {
                TEXT: {
                    body: string //JSON-formatted string
                }
            }
        }
    },
    sessionAttributes: {
        [key: string]: string
    },
    promptSessionAttributes: {
        [key: string]: string
    },
    knowledgeBasesConfiguration?: [
        {
            knowledgeBaseId: string,
            retrievalConfiguration: {
                vectorSearchConfiguration: {
                    numberOfResults: number,
                    filter: {
                        RetrievalFilter: any
                    }
                }
            }
        }
    ]
}

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

    const baseUrl = `${process.env.BACKSTAGE_URL}/docs`

    /*
     * TODO: Implement a more robust check to see if the link is valid
     */
    return link.startsWith(baseUrl) ? buildResponse(event, { valid: true }) : buildResponse(event, { valid: false })
}

const createGitHubApp = (event: AgentActionEvent): AgentActionResponse => {
    const teamName = event.parameters.find(param => param.name === 'teamName')?.value

    if(!teamName) {
        return buildResponse(event, { error: 'No teamName provided' })
    }
    /*
     * TODO: Perform the necessary steps to create a GitHub App
     */
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