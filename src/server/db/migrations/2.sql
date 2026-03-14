CREATE TABLE chats (
    chat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP DEFAULT now(),
    name VARCHAR(20) DEFAULT 'chat'
);

CREATE TABLE chat_members (
    chat_id UUID REFERENCES chats ON DELETE CASCADE,
    user_id UUID REFERENCES users ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT now(),
    UNIQUE(chat_id, user_id)
);

CREATE TABLE messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES chats ON DELETE CASCADE,
    sender_id UUID REFERENCES users ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT now(),
    content VARCHAR(200) NOT NULL
);
