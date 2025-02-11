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
import { AgentMessage } from '#/amplify/functions/common/message.ts'

export type ChatProps = {
    history: AgentMessage[];
}

const Chat = ({ history = [] }: ChatProps) => {
    //order history by id
    const orderedHistory = history.sort((a, b) => a.id.localeCompare(b.id))

    const boxRef = useRef<HTMLDivElement>(null);

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
            {orderedHistory?.length > 0 ? (
                <Stack spacing={3}>
                    {/*sort history by id*/}
                    {orderedHistory?.map((msg) => (
                        <Box sx={{ padding: "8px" }} key = {msg.id}>
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
                            {msg.answer && (
                                <Card
                                    raised
                                    sx={{ bgcolor: "text.secondary", color: "white", width: "65%" }}
                                >
                                    <CardContent>
                                        <Typography>
                                            <Linkify>{msg.answer}</Linkify>
                                        </Typography>
                                        <Typography variant="caption">
                                            {msg.sessionId}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            )}
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

export default Chat;
