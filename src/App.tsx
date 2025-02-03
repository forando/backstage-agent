import { type Schema } from '#/amplify/data/resource'
import { generateClient } from 'aws-amplify/api'
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Chat, {ChatHistory} from "./Chat";
import { useState } from "react";
import { TextField, Typography } from "@mui/material";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import DeleteIcon from "@mui/icons-material/Delete";
import LoadingSpinner from "./Spinner";
import IconButton from "@mui/material/IconButton";
import SendIcon from "@mui/icons-material/Send";

const client = generateClient<Schema>();

export default function App() {

    const [history, setHistory] = useState<ChatHistory[]>([]);
    const [question, setQuestion] = useState('');
    const [spinner, setSpinner] = useState(false);
    const [sessionId, setSessionId] = useState(`session-${Date.now()}`);
    const [memoryId, setMemoryId] = useState<string | null>(null);

    const sendPrompt = async () => {

        const { data, errors } = await client.queries.invokeAgent({
            prompt: question,
            sessionId,
            memoryId
        });

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
                console.log("response", response);
                setSpinner(false);
                setHistory([
                    ...history,
                    {
                        question: question,
                        response: response?.answer || "No answer found",
                        citation: 'citation',
                    },
                ]);
            })
            .catch((_: any) => {
                setSpinner(false);
                setHistory([
                    ...history,
                    {
                        question: question,
                        response:
                            "Error generating an answer. Please check your browser console, WAF configuration, Bedrock model access, and Lambda logs for debugging the error.",
                        citation: undefined,
                    },
                ]);
            });
    };

    const handleKeyDown = (e: any) => {
        if (e.key === "Enter") {
            handleSendQuestion();
        }
    }

    const onClearHistory = () => {
        setHistory([])
        setSessionId(`session-${Date.now()}`)
    }

    return (
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
    );
}