import express from "express";
import cookieParser from "cookie-parser";
import type { Request, Response, NextFunction } from "express";
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AuthenticationError, DatabaseError } from "./customErrors.js"
import { config } from "./config.js";
import * as db  from "./db/index.js";
import { makeJWT, validateJWT, authorize, hashPassword, checkPasswordHash } from "./auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.join(path.dirname(__filename), "../../");
const mainPage = path.join(__dirname, "./src/client/public/index.html");
const publicFilesDir = path.join(__dirname, "./src/client/public");

const app = express();
const httpPort = 8080;
const HOST = '0.0.0.0';

app.use("/public", express.static("./src/client/public"));
app.use(express.urlencoded({extended: true}));
app.use(middlewareLogResponses, express.json(), cookieParser());

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
    res.cookie('token', token);
    res.status(200).send(JSON.stringify({user_id: user.user_id}));
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
        res.cookie('token', token);
        res.status(200).send(JSON.stringify({user_id: user.user_id}));
    } else {
        res.status(400).send("Invalid login or password.");
    }
});


app.get("/home", (req: Request, res: Response) => {
    res.status(200).sendFile(mainPage);
});

app.get("/api/chats", async (req: Request, res: Response) => {
    const user_id = authorize(req);
    const chats = await db.getChats(user_id);
    res.status(200).setHeader("Content-Type", "application/json").send(JSON.stringify(chats));
});

app.get("/api/chats/:chat_id", async (req: Request<{chat_id: string;}>, res: Response) => {
    const user_id = authorize(req);
    const chat_id = req.params.chat_id;
    const messages: db.Message[] = await db.getChatMessages(chat_id, user_id);
    res.status(200).setHeader("Content-Type", "application/json").send(JSON.stringify(messages));
});

app.post("/api/chats", async (req: Request, res: Response) => {
    const user_id = authorize(req);
    const { name } = req.body;
    const chat = await db.createChat(name, user_id);
    res.status(200).setHeader("Content-Type", "application/json").send(JSON.stringify(chat));
});

app.get("/users", async (req: Request, res: Response) => {
    const user_id = authorize(req);
    const users = await db.getUserEmails();
    res.status(200).setHeader("Content-Type", "application/json").send(JSON.stringify(users));
});



app.use(errorHandler);

const server = app.listen(httpPort, () => {
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
