import {
    Box,
    Stack,
    Card,
    CardContent,
    Typography,
} from "@mui/material";
import { useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import Linkify from 'linkify-react'

export type ChatHistory = {
    question: string;
    response: string;
    citation?: string;
}

export type ChatProps = {
    history: ChatHistory[];
}

const Chat = (props: ChatProps) => {
    const history = props.history;

    const boxRef = useRef(null);

    useEffect(() => {
        if (boxRef.current) {
            boxRef.current.scrollTop = boxRef.current.scrollHeight;
        }
    }, [history]);

    return (
        <Box
            ref={boxRef}
            sx={{
                backgroundColor: "#f0f0f0",
                paddingBottom: "20px",
                overflowY: "auto",
                maxHeight: "650px",
            }}
        >
            {history?.length > 0 ? (
                <Stack spacing={3}>
                    {history?.map((msg) => (
                        <Box sx={{ padding: "8px" }} key = {msg}>
                            <Box sx={{ paddingBottom: "8px" }}>
                                <Card
                                    raised
                                    sx={{
                                        bgcolor: "primary.main",
                                        marginLeft: "auto",
                                        color: "white",
                                        width: "65%",
                                    }}
                                >
                                    <CardContent>
                                        <Typography>{msg.question}</Typography>
                                    </CardContent>
                                </Card>
                            </Box>

                            <Card
                                raised
                                sx={{ bgcolor: "text.secondary", color: "white", width: "65%" }}
                            >
                                <CardContent>
                                    <Typography>
                                        <Linkify>{msg.response}</Linkify>
                                    </Typography>
                                    <Typography variant="caption">
                                        {msg.citation ? msg.citation : ""}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Box>
                    ))}
                </Stack>
            ) : (
                <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    padding="30px"
                >
                    <Typography variant="body1" color="textSecondary">
                        No chat history
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

Chat.propTypes = { history: PropTypes.array };
Chat.defaultProps = { history: [] };

export default Chat;
