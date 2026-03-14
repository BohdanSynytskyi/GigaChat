export class AuthenticationError extends Error {
    constructor(message: string) {
        super(message);
    }
}

export class DatabaseError extends Error {
    constructor(message: string) {
        super(message);
    }
}
