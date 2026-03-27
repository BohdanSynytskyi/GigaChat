import { WebSocketServer, WebSocket } from "ws";
import * as db from "../server/db/index.js";
import { AuthWebSocket } from "../server/customTypes";
import { IncomingMessage, createServer } from "node:http";
import { validateJWT } from "../server/auth.js";
import { AuthenticationError } from "../server/customErrors.js"
import { parse } from "cookie";
import { config } from "../server/config.js";

const WSS_PORT = 8081
const server = createServer();
const wss = new WebSocketServer({noServer: true});
const chatToClients = new Map();

server.on('upgrade', (req: IncomingMessage, socket, head) => {
    try {
        const url = new URL(req.url!, `http://localhost:8081`);
        const chat_id = url.searchParams.get("chat_id");
        const cookies = req.headers.cookie;
        if(chat_id === null || cookies === undefined) {
            throw new Error("Invalid upgrade request. There is no chat_id in the query or cookie file is corrupted");
        }
        const token = parse(cookies).token;
        if(token === undefined) {
            throw new AuthenticationError("JWT token is not provided");
        }
        const user_id = validateJWT(token, config.secret);
        wss.handleUpgrade(req, socket, head, (ws, req) => {
            const websocket: AuthWebSocket = ws as AuthWebSocket;
            websocket.user_id = user_id;
            websocket.chat_id = chat_id;
            if(chatToClients.has(chat_id)){
                const clients: AuthWebSocket[] = chatToClients.get(chat_id);
                for(const client of clients) {
                    if(client.user_id === websocket.user_id) {
                        throw new Error("There already exists a connection with this client");
                    }
                }
                clients.push(websocket);
            } else {
                chatToClients.set(chat_id, []);
                chatToClients.get(chat_id).push(websocket);
            }
            wss.emit('connection', websocket, req);
        });
    } catch(e) {
        if(e instanceof AuthenticationError) {
            console.error("Error while processing upgrade request: ", e.message);
            socket.write(
                'HTTP/1.1 401 Unauthorized\r\n' +
                'Connection: close\r\n' +
                '\r\n'
            );
            socket.destroy();
            return;
        } else if(e instanceof Error) {
            console.error("Error while processing upgrade request: ", e.message);
            socket.destroy();
        }

    }
});

wss.on('connection', (ws: AuthWebSocket, req: IncomingMessage) => {
  console.log(`Client with user_id: ${ws.user_id} connected to chat_id: ${ws.chat_id}`);

  ws.on('message', async (message) => {
    const content = message.toString();
    await db.insertChatMessage(ws.chat_id, ws.user_id, content);
    chatToClients.get(ws.chat_id).forEach((client: AuthWebSocket) => {
        client.send(JSON.stringify({sender_id: ws.user_id, content: content}));
    });
  });

  ws.on('close', () => {
    console.log(`Client with user_id: ${ws.user_id} disconnected`);
    const chatMembers: AuthWebSocket[] = chatToClients.get(ws.chat_id);
    if(chatMembers !== undefined){
        for(let i = 0; i < chatMembers.length; i++) {
            if(chatMembers[i].user_id === ws.user_id) {
                chatMembers.splice(i, 1);
                break;
            }
        }
    }
  });

  ws.on('error', (error: Error) => {
      console.error("Web Socket Server error: ", error.message);
      ws.close();
  });
});

server.listen(WSS_PORT, () => {
    console.log(`Websocket server is running on port: ${WSS_PORT}`);
});

wss.on('error', errorHandler);

function errorHandler(err: Error) {
    console.error("Something went wrong: ", err.message);
}

async function shutdown() {
    console.log("Shutting down websocket server...");
    wss.clients.forEach((client: WebSocket) => {
        client.close();
    });
    wss.close();
    server.close(async () => {
        try {
            process.exit(0)
        } catch(e) {
            if(e instanceof Error) {
                console.error("Error while quitting: ", e.message);
            }
            process.exit(1);
        }
    });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
