import type { WebSocket } from "ws";

export type AuthWebSocket = WebSocket & {
    user_id: string;
    chat_id: string;
};
