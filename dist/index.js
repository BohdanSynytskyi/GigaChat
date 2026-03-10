import express from "express";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AuthenticationError } from "./custromErrors.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.join(path.dirname(__filename), "../");
const mainPage = path.join(__dirname, "./src/client/index.html");
const publicFilesDir = path.join(__dirname, "./src/client/public");
const app = express();
const httpPort = 8080;
const server = createServer(app);
const wss = new WebSocketServer({ server: server });
app.use("/public", express.static("./src/client/public"));
app.use(express.urlencoded({ extended: true }));
const userMap = new Map();
app.get("/", (req, res) => {
    res.sendFile(`${publicFilesDir}/login.html`);
});
app.post("/signup", (req, res) => {
    const signupForm = req.body;
    if (signupForm === undefined) {
        throw new AuthenticationError("Invalid credentials");
    }
    console.log(`User with name ${signupForm.login} created`);
    userMap.set(signupForm.login, signupForm.password);
    res.status(200).sendFile(mainPage);
});
app.get("/signup", (req, res) => {
    res.sendFile(`${publicFilesDir}/signup.html`);
});
app.post("/login", (req, res) => {
    const loginForm = req.body;
    if (loginForm === undefined) {
        throw new Error("Invalid credentials");
    }
    if (userMap.has(loginForm.login) && userMap.get(loginForm.login) === loginForm.password) {
        res.status(200).send(mainPage);
    }
    else {
        res.status(400).send("Invalid login or password.");
    }
});
wss.on('connection', (socket) => {
    console.log('Client connected');
    socket.send('Hello from server');
    socket.on('message', (message) => {
        console.log('Received:', message.toString());
        socket.send(`You said: ${message}`);
    });
    socket.on('close', () => {
        console.log('Client disconnected');
    });
});
app.use(errorHandler);
server.listen(httpPort, () => {
    console.log(`Server is listening on port ${httpPort}...`);
});
function errorHandler(err, req, res, next) {
    let errorPayload = { "error": "Something went wrong on our end" };
    res.setHeader("Content-Type", "application/json");
    if (err instanceof AuthenticationError) {
        errorPayload.error = err.message;
        res.status(401).send(JSON.stringify(errorPayload));
    }
    else if (err instanceof Error) {
        console.error("Error: ", err.message);
    }
    else {
        res.status(500).send(JSON.stringify(errorPayload));
    }
}
