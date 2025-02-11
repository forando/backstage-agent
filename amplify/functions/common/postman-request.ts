import { AgentMessage } from './message'

export enum PostmanRequestType {
    ASK = 'ASK',
    GET_ANSWER = 'GET_ANSWER',
}

export type PostmanRequestAsk = {
    requestType: PostmanRequestType.ASK,
    message: AgentMessage
}

export type PostmanRequestGetAnswer = {
    requestType: PostmanRequestType.GET_ANSWER,
    messageId: string
}

export type PostmanRequest = PostmanRequestAsk | PostmanRequestGetAnswer