import express from "express";
import type { Request, Response, NextFunction } from "express";
import type { AuthWebSocket } from "./customTypes.js";
import { createServer, type IncomingMessage } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AuthenticationError, DatabaseError } from "./customErrors.js"
import { config } from "./config.js";
import * as db  from "./db/index.js";
import { makeJWT, validateJWT, hashPassword, checkPasswordHash, getBearerToken, getBearerTokenUpgrade } from "./auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.join(path.dirname(__filename), "../");
const mainPage = path.join(__dirname, "./src/client/public/index.html");
const publicFilesDir = path.join(__dirname, "./src/client/public");

const app = express();
const httpPort = 8080;

const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });
const chatToClients = new Map();

app.use("/public", express.static("./src/client/public"));
app.use(express.urlencoded({extended: true}));
app.use(middlewareLogResponses, express.json());

app.get("/", (req: Request, res: Response) => {
    res.redirect('/login');
});

app.get("/login", (req: Request, res: Response) => {
    res.sendFile(`${publicFilesDir}/login.html`);
});

app.post("/signup", async (req: Request, res: Response) => {
    const { login, password } = req.body;
    if(login === undefined || password === undefined) {
        throw new AuthenticationError("Invalid credentials");
    }

    const hashedPassword = await hashPassword(password)
    const user = await db.addUser(login, hashedPassword);
    console.log(`User with name ${login} created`);
    const token = makeJWT(user.user_id, 3600, config.secret);

    res.setHeader("Content-Type", "application/json");
    res.status(200).send(JSON.stringify({token: token}));
});


app.get("/signup", (req: Request, res: Response) => {
    res.sendFile(`${publicFilesDir}/signup.html`);
});

app.post("/login", async (req: Request, res: Response) => {
    const {login, password} = req.body;
    if(login === undefined || password === undefined) {
        throw new AuthenticationError("Invalid credentials");
    }
    
    const user = await db.getUser(login);
    if(user.email === login && await checkPasswordHash(password, user.hashed_password)){
        const token = makeJWT(user.user_id, 3600, config.secret);
        res.setHeader("Content-Type", "application/json");
        res.status(200).send(JSON.stringify({token: token}));
    } else {
        res.status(400).send("Invalid login or password.");
    }
});


app.get("/home", (req: Request, res: Response) => {
    res.status(200).sendFile(mainPage);
});

app.get("/chats", async (req: Request, res: Response) => {
    const token = getBearerToken(req);
    const user_id = validateJWT(token, config.secret);
    const chats = await db.getChats(user_id);
    res.status(200).setHeader("Content-Type", "application/json").send(JSON.stringify(chats));
});

app.get("/chats/:chat_id", async (req: Request<{chat_id: string;}>, res: Response) => {
    const token = getBearerToken(req);
    const user_id = validateJWT(token, config.secret);
    const chat_id = req.params.chat_id;
    const messages = await db.getChatMessages(chat_id, user_id);
    res.status(200).setHeader("Content-Type", "application/json").send(JSON.stringify(messages));
});

app.post("/chats", async (req: Request, res: Response) => {
    const token = getBearerToken(req);
    const user_id = validateJWT(token, config.secret);
    const { name } = req.body;
    const chat = await db.createChat(name, user_id);
    res.status(200).setHeader("Content-Type", "application/json").send(JSON.stringify(chat));
});

server.on('upgrade', (req: IncomingMessage, socket, head) => {
    try {
        const token = getBearerTokenUpgrade(req);
        const user_id = validateJWT(token, config.secret);
        const url = new URL(req.url!, `http://localhost:8080`);
        const chat_id = url.searchParams.get("chat_id");
        if(chat_id === null) {
            throw new Error("Invalid upgrade request. There is no chat_id in the query");
        }
        wss.handleUpgrade(req, socket, head, (ws, req) => {
            const websocket: AuthWebSocket = ws as AuthWebSocket;
            websocket.user_id = user_id;
            websocket.chat_id = chat_id;
            if(chatToClients.has(chat_id)){
                chatToClients.get(chat_id).push(websocket);
            } else {
                chatToClients.set(chat_id, []);
                chatToClients.get(chat_id).push(websocket);
            }
            wss.emit('connection', websocket, req);
        });
    } catch(e) {
        if(e instanceof AuthenticationError) {
            socket.write(
                'HTTP/1.1 401 Unauthorized\r\n' +
                'Connection: close\r\n' +
                '\r\n'
            );
            socket.destroy();
            return;
        }
    }
});

wss.on('connection', (ws: AuthWebSocket, req: IncomingMessage) => {
  console.log(`Client with user_id: ${ws.user_id} connected to chat_id: ${ws.chat_id}`);

  ws.on('message', async (message) => {
    const content = message.toString();
    await db.insertChatMessage(ws.chat_id, ws.user_id, content);
    chatToClients.get(ws.chat_id).forEach((client: AuthWebSocket) => {
        client.send(JSON.stringify({sender_id: ws.user_id, message: content}));
    });
  });

  ws.on('close', () => {
    console.log(`Client with user_id: ${(ws as any).user} disconnected`);
  });
  ws.on('error', (error: Error) => {
      console.error("Web Socket Server error: ", error.message);
      ws.close();
  });
});


app.use(errorHandler);

server.listen(httpPort, () => {
    console.log(`Server is listening on port ${httpPort}...`);
});

function middlewareLogResponses(req: Request, res: Response, next: NextFunction){
    res.on("finish", () => {
        if(req.originalUrl === "/.well-known/appspecific/com.chrome.devtools.json") return;
        if(res.statusCode !== 200){
            console.log(`[NON-OK] ${req.method} ${req.url} - Status: ${res.statusCode}`);
        } else {
            console.log(`[OK] ${req.method} ${req.url} - Status: ${res.statusCode}`);
        }
    });
    next();
}

async function shutdown() {
    console.log("Shutting down server...");
    wss.clients.forEach((client: WebSocket) => {
        client.close();
    });
    wss.close();
    server.close(async () => {
        try {
            console.log("Shutting down the database...");
            await db.pool.end();
            console.log("Database pool closed.");
            process.exit(0)
        } catch(e) {
            if(e instanceof Error) {
                console.error("Error while quitting: ", e.message);
            }
            process.exit(1);
        }
    });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
    let errorPayload = {"error": "Something went wrong on our end"};
    res.setHeader("Content-Type", "application/json");
    if(err instanceof AuthenticationError){
        errorPayload.error = err.message;
        console.error("AuthenticationError: ", err.message);
       res.status(401).send(JSON.stringify(errorPayload));
    } else if(err instanceof DatabaseError) {
        console.error("Database Error: ", err.message);
        res.status(400).send(JSON.stringify({message: "Invalid data requested"}))
    } else if(err instanceof Error) {
        console.error("Error: ", err.message);
        res.status(500).send(JSON.stringify(errorPayload));
    } else{
       res.status(500).send(JSON.stringify(errorPayload));
    }
}
