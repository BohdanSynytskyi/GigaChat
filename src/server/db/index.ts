import { Pool } from "pg";
import { config } from "../config.js"
import { AuthenticationError, DatabaseError } from "../customErrors.js";

export const pool = new Pool({
    connectionString: config.db_url,
    max: 5,
});

export type Message = {
    message_id: string;
    sender_id: string;
    chat_id: string;
    content: string;
    created_at: Date;
};

export type User = {
    user_id: string;
    created_at: Date;
    email: string;
    hashed_password: string;
};

export type Chat = {
    chat_id: string;
    created_at: Date;
    name: string;
};

export const addUser = async (login: string, hashed_password: string): Promise<User> => {
    const text = "INSERT INTO users(email, hashed_password) VALUES($1, $2) RETURNING *";
    try {
        const res = await pool.query(text, [login, hashed_password]);
        return res.rows[0];
    } catch (e: unknown) {
        throw new Error("Database insertion failed");
    }
};


export const getUser = async (login: string): Promise<User> => {
    const text = "SELECT * FROM users WHERE email = $1";
    const res = await pool.query(text, [login]);
    if(res.rows[0] === undefined){
        throw new AuthenticationError("User with these credentials doesn't exist");
    }
    return res.rows[0];
};

export const getChats = async (user_id: string): Promise<Chat[]> => {
    try {
    const text = "SELECT * FROM chats WHERE chat_id IN (SELECT chat_id FROM chat_members WHERE user_id = $1)";
    const res = await pool.query(text, [user_id]);
    return res.rows;
    } catch(e: unknown) {
        if(e instanceof Error){
            throw new DatabaseError("There was an error in getChats query: " + e.message);
        } else {
            throw new DatabaseError("There was an error in getChats query")
        }
    }
};

export const createChat = async (chatName: string, user_id: string): Promise<Chat> => {
    try {
        const chatText = "INSERT INTO chats(chat_id, created_at, name) VALUES(DEFAULT, DEFAULT, $1) RETURNING *";
        const chat = await pool.query(chatText, [chatName]);
        const userText = "INSERT INTO chat_members(chat_id, user_id) VALUES($1, $2)";
        const res = await pool.query(userText, [chat.rows[0].chat_id, user_id]);
        return res.rows[0];
    } catch(e: unknown) {
        if(e instanceof Error){
            throw new DatabaseError("There was an error in createChat query: " + e.message);
        } else {
            throw new DatabaseError("There was an error in createChat query")
        }
    }
};

export const getChatMessages = async (chat_id: string, user_id: string): Promise<Message[]> => {
    try {
        const queryText = "SELECT * FROM messages WHERE chat_id IN (SELECT chat_id FROM chat_members WHERE chat_id = $1 AND user_id = $2) ORDER BY created_at ASC";
        const res = await pool.query(queryText, [chat_id, user_id]);
        let messages: Message[] = [];
        if(res.rowCount && res.rowCount > 0) {
            messages = res.rows; 
        }
        return messages;
    } catch(e: unknown) {
        if(e instanceof Error){
            throw new DatabaseError("There was an error in getChatMessages query: " + e.message);
        } else {
            throw new DatabaseError("There was an error in getChatMessages query")
        }
    }
};

export const insertChatMessage = async (chat_id: string, user_id: string, content: string): Promise<Message> => {
    try {
        const queryText = "INSERT INTO messages(chat_id, sender_id, content) VALUES($1, $2, $3) RETURNING *";
        const res = await pool.query(queryText, [chat_id, user_id, content]);
        if(!res.rowCount) {
            throw new DatabaseError("Message was not inserted");
        }
        return res.rows[0];
    } catch(e: unknown) {
        if(e instanceof Error){
            throw new DatabaseError("There was an error in getChatMessages query: " + e.message);
        } else {
            throw new DatabaseError("There was an error in getChatMessages query")
        }
    }
};
