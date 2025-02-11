import { type Schema } from '#/amplify/data/resource'
import { generateClient } from 'aws-amplify/api'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import { useEffect, useState } from "react";
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

type AppSyncEvent = {
    event: Schema["AgentMessage"]["type"]
}


const client = generateClient<Schema>({authMode: 'userPool'})

type Subscription = {
    unsubscribe: () => void
}

export default function App() {

    const [history, setHistory] = useState<Schema["AgentMessage"]["type"][]>([])
    const [question, setQuestion] = useState('')
    const [spinner, setSpinner] = useState(false)
    const [sessionId, setSessionId] = useState(`session-${Date.now()}`)
    const [memoryId, setMemoryId] = useState<string | null>(null)
    const [subscription, setSubscription] = useState<Subscription | null>(null)

    useEffect(() => {
        const sub = client.models.AgentMessage.observeQuery().subscribe({
            next: ({ items }) => {
                const currentSessionMessages = items.filter((item) => item.sessionId === sessionId)
                setHistory([...currentSessionMessages])
            },
        })

        let channel: EventsChannel

        const connectAndSubscribe = async () => {
            channel = await events.connect('default/channel')

            channel.subscribe({
                next: async (data: AppSyncEvent) => {
                    setSpinner(false)
                    console.log('received', data)
                    const message = await client.models.AgentMessage.get({ id: data.event.id })
                    if(!message.data) {
                        setHistory([
                            ...history,
                            {
                                id: 'error',
                                question: data.event.question,
                                answer:
                                    "Error generating an answer. Please check your browser console, WAF configuration, Bedrock model access, and Lambda logs for debugging the error.",
                                sessionId: 'error',
                                createdAt: '',
                                updatedAt: '',
                                session: () => Promise.resolve({ id: 'error', data: null }),
                            },
                        ]);
                        return
                    }
                    message.data.answer = data.event.answer!
                    await client.models.AgentMessage.update(message.data)
                },
                error: (err) => console.error('error', err),
            })
        }

        connectAndSubscribe().catch(err => console.error(err))

        client.models.ChatSession.create({ id: sessionId })
            .catch((err) => console.error(err))

        setSubscription(sub)

        return () => {
            sub.unsubscribe()
            channel && channel.close()
        }
    }, [])

    const sendPrompt = async () => {

        const id = `message-${Date.now()}`

        const { data, errors } = await client.models.AgentMessage.create({
            id,
            question: question,
            sessionId: sessionId,
            memoryId: memoryId,
        })

        if (!errors) {
            setMemoryId(data?.memoryId || null)
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
                        response,
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
                        createdAt: '',
                        updatedAt: '',
                        session: () => Promise.resolve({ id: 'error', data: null }),
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
        const newSessionId = `session-${Date.now()}`
        client.models.ChatSession.create({ id: newSessionId })
            .then((result) => {
                if(result.data) {
                    setSessionId(result.data.id)
                    setHistory([])
                    subscription?.unsubscribe()
                    const sub = client.models.AgentMessage.observeQuery().subscribe({
                        next: ({ items }) => {
                            const currentSessionMessages = items.filter((item) => item.sessionId === result.data?.id)
                            setHistory([...currentSessionMessages])
                        },
                    })
                    setSubscription(sub)
                }
            })
            .catch((err) => console.error(err))
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