export type AgentMessage = {
    id: string
    question: string
    answer?: string
    sessionId: string
    memoryId?: string
}