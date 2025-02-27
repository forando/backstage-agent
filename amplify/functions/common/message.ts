export type AgentMessage = {
    id: string
    question: string
    answer?: string
    sessionId: string
    memoryId?: string
}

export type FlowMessage = {
    id: string
    answer?: string
    sessionId: string
    followupQuestion?: string
    executionId?: string
    agentNode: string
}

export type FlowAppSyncEvent = {
    event: FlowMessage
}

export type AgentAppSyncEvent = {
    event: AgentMessage
}