CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(256) NOT NULL UNIQUE,
    created_at timestamp NOT NULL DEFAULT now(),
    hashed_password VARCHAR(256) NOT NULL
);
