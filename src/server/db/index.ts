import { Pool } from "pg";
import { config } from "../config.js"
import { AuthenticationError } from "../customErrors.js";

export const pool = new Pool({
    connectionString: config.db_url,
    max: 5,
});

export type User = {
    userId: string,
    createdAt: Date,
    email: string,
    hashed_password: string
};

export type Chat = {
    chatId: string,
    createdAt: Date,
    name: string,
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

export const getChats = async (userId: string): Promise<Chat[]> => {
    const text = "SELECT * FROM chats";
    const res = await pool.query(text);
    if(res.rows[0] === undefined){
        throw new Error("There is no chats in the database");
    }
    return res.rows;
};

export const createChat = async (chatName: string, userId: string): Promise<void> => {
    const chatText = "INSERT INTO chats(id, created_at, name) VALUES(DEFAULT, DEFAULT, $1) RETURNING *";
    const chat = await pool.query(chatText, [chatName]);
    const userText = "INSERT INTO chat_members(chat_id, user_id) VALUES($1, $2)";
    await pool.query(userText, [chat.rows[0].id, userId]);
};
