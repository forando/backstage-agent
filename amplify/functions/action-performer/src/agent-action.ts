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