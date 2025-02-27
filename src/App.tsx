import { type Schema } from '#/amplify/data/resource'
import { generateClient } from 'aws-amplify/api'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import { useEffect, useState, useRef } from "react";
import { TextField, Typography } from '@mui/material'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'
import DeleteIcon from '@mui/icons-material/Delete'
import IconButton from '@mui/material/IconButton'
import SendIcon from '@mui/icons-material/Send'
import { Authenticator } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'
import './App.css'
import Chat from './Chat'
import LoadingSpinner from './Spinner'

import { events, type EventsChannel } from 'aws-amplify/data'
import { AgentMessage } from '#/amplify/functions/common/message.ts'

type FlowMessage = AgentMessage & {
    executionId?: string
}

type AppSyncEvent = {
    event: FlowMessage
}

const client = generateClient<Schema>({authMode: 'userPool'})

export default function App() {

    const [history, setHistory] = useState<AgentMessage[]>([])
    const [question, setQuestion] = useState('')
    const [spinner, setSpinner] = useState(false)
    const [sessionId, setSessionId] = useState(`session-${Date.now()}`)
    // const [executionId, setExecutionId] = useState<string | undefined>(undefined)
    const sessionIdRef = useRef(sessionId)
    const [memoryId, setMemoryId] = useState<string | undefined>(undefined)

    useEffect(() => {
        sessionIdRef.current = sessionId;
    }, [sessionId])

    useEffect(() => {

        let channel: EventsChannel

        const connectAndSubscribe = async () => {
            channel = await events.connect('default/channel')

            channel.subscribe({
                next: async (data: AppSyncEvent) => {
                    console.log('received', data)
                    if(data.event.sessionId !== sessionIdRef.current) {
                        return
                    }
                    setSpinner(false)
                    // setExecutionId(data.event.executionId || 'dummy')
                    setHistory((history) => {
                        const message = history.find((msg) => msg.id === data.event.id)
                        if(!message) {
                            console.error('message not found in history:', history)
                            return [
                                ...history,
                                {
                                    id: 'error',
                                    question: data.event.question,
                                    answer:
                                        "Error generating an answer. Please check your browser console, WAF configuration, Bedrock model access, and Lambda logs for debugging the error.",
                                    sessionId: 'error',
                                },
                            ]
                        }
                        // message.answer = data.event.question || data.event.answer
                        message.answer = data.event.answer
                        return [...history]
                    })
                },
                error: (err) => console.error('error', err),
            })
        }

        connectAndSubscribe().catch(err => console.error(err))

        return () => {
            channel && channel.close()
        }
    }, [])

    /*const sendPrompt = async () => {

        const { data, errors } = await client.queries.invokeClassifierPrompt(
            { question: JSON.stringify(
                    {
                        promptVariables: [{
                            name: "input",
                            value: question
                        }]
                    }
                )
            }
        )

        if (!errors) {
            setMemoryId(memoryId || undefined)
            return data
        } else {
            console.log(errors)
            throw new Error("cannot generate response")
        }
    };

    const handleSendQuestion = () => {
        setSpinner(true);

        sendPrompt()
            .then((response) => {
                setSpinner(false);
                if(response) {
                    setHistory([
                        {
                            id: `message-${Date.now()}`,
                            question,
                            answer: response,
                            sessionId
                        },
                    ])
                    setQuestion('')
                }
            })
            .catch((_: any) => {
                setSpinner(false);
                setHistory([
                    ...history,
                    {
                        id: 'error',
                        question: question,
                        answer:
                            "Error generating an answer. Please check your browser console, WAF configuration, Bedrock model access, and Lambda logs for debugging the error.",
                        sessionId: 'error',
                    },
                ])
            })
    }*/

    const sendPrompt = async () => {

        const id = `message-${Date.now()}`

        /*let agentQuestion: any

        if(executionId) {
            agentQuestion = [
                {
                    nodeName: 'BackstageAgent',
                    nodeInputName: 'agentInputText',
                    content: {
                        document: question
                    }
                }
            ]
        } else {
            agentQuestion = [
                {
                    nodeName: 'FlowInput',
                    nodeOutputName: 'document',
                    content: {
                        document: question
                    }
                }
            ]
        }*/

        const data: FlowMessage = {
            id,
            // question: JSON.stringify(agentQuestion),
            question,
            sessionId,
            // executionId,
            memoryId,
        }

        const { errors } = await client.queries.invokeAgent(data)

        if (!errors) {
            setMemoryId(memoryId || undefined)
            return data
        } else {
            console.log(errors)
            throw new Error("cannot generate response")
        }
    };

    const handleSendQuestion = () => {
        setSpinner(true);

        sendPrompt()
            .then((response) => {
                if(response) {
                    setHistory([
                        ...history,
                        {
                            ...response,
                            question
                        },
                    ])
                    setQuestion('')
                }
            })
            .catch((_: any) => {
                setSpinner(false);
                setHistory([
                    ...history,
                    {
                        id: 'error',
                        question: question,
                        answer:
                            "Error generating an answer. Please check your browser console, WAF configuration, Bedrock model access, and Lambda logs for debugging the error.",
                        sessionId: 'error',
                    },
                ]);
            });
    };

    const handleKeyDown = (e: any) => {
        if (e.key === "Enter") {
            handleSendQuestion()
        }
    }

    const onClearHistory = () => {
        setSessionId(`session-${Date.now()}`)
        // setExecutionId(undefined)
        setHistory([])
    }

    return (
        <Authenticator>
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: "100vh",
                    padding: "30px",
                    backgroundColor: "#f0f0f0",
                }}
            >
                <Paper
                    sx={{
                        padding: 8,
                        maxWidth: 600,
                    }}
                >
                    <Typography variant="h5" sx={{ textAlign: "center" }}>
                        Backstage Agent
                    </Typography>
                    <br></br>
                    <br></br>
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            height: "100%",
                        }}
                    >
                        <Divider />
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                paddingBottom: "10px",
                                paddingTop: "20px",
                            }}
                        >
                            <Typography variant="overline">3. Ask a question:</Typography>
                            <Button
                                disabled={history.length === 0}
                                startIcon={<DeleteIcon />}
                                onClick={onClearHistory}
                            >
                                Clear History
                            </Button>
                        </Box>
                        <Chat history={history} />
                        <br></br>
                        {spinner ? (
                            <Box sx={{ justifyContent: "center", padding: "20px" }}>
                                <LoadingSpinner />
                            </Box>
                        ) : (
                            <br></br>
                        )}
                    </Box>
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            paddingBottom: "20px",
                            paddingTop: "20px",
                        }}
                    >
                        <TextField
                            disabled={spinner}
                            variant="standard"
                            label="Enter your question here"
                            value={question}
                            onChange={(e) => setQuestion(e.target?.value)}
                            onKeyDown={handleKeyDown}
                            sx={{ width: "95%" }}
                        />
                        <IconButton
                            disabled={spinner}
                            onClick={handleSendQuestion}
                            color="primary"
                        >
                            <SendIcon />
                        </IconButton>
                    </Box>
                </Paper>
            </Box>
        </Authenticator>
    );
}