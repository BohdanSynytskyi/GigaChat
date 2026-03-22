import { hash, verify } from "argon2";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import type { Request } from "express";
import { randomBytes } from "node:crypto";
import { AuthenticationError } from "./customErrors.js";
import { config } from "./config.js";

type payload = Pick<JwtPayload, "iss" | "sub" | "iat" | "exp">;

export async function hashPassword(password: string): Promise<string> {
    const hashedPass = await hash(password);
    return hashedPass;
}

export async function checkPasswordHash(password: string | undefined, hash: string | undefined): Promise<boolean> {
    if(password === undefined || hash === undefined){
        throw new Error("Something went wrong");
    }
    return await verify(hash, password);
}

function getBearerToken(req: Request): string {
    const token = req.cookies.token;

    if (!token) {
        throw new AuthenticationError("JWT must be provided");
    }

    return token;
}

// Extracts token from the request object and returns the associated user_id
export function authorize(req: Request): string {
    const token = getBearerToken(req);
    return validateJWT(token, config.secret);
}


export function getAPIKey(req: Request): string {
    try {
        const token = req.get("Authorization");
        const pieces: string[] = (token as string).split(" ");
        if(pieces[0] != "ApiKey"){
            throw new AuthenticationError("Invalid header value");
        }
        return pieces[1];
    } catch(e: unknown){
        if(e instanceof Error){
            throw new AuthenticationError(e.message);
        }
        throw new AuthenticationError("Invalid authorization header");
    }
};

export function makeRefreshToken() {
    return randomBytes(32).toString("hex");
}

export function makeJWT(userID: string, expiresIn: number, secret: string): string {
    const createdAt = Math.floor(Date.now() / 1000);
    const payload: payload = {iss: "gigachat", sub: userID, iat: createdAt, exp: createdAt + expiresIn};
    return jwt.sign(payload, secret);
}

export function validateJWT(tokenString: string, secret: string): string {
    try {
        let decodedToken = jwt.verify(tokenString, secret);
        if(typeof decodedToken === "string"){
            throw new Error("invalid object signed");
        }
        if(decodedToken.sub===undefined){
            throw new Error("Authentication failed");
        }
        return decodedToken.sub;
    } catch(err: unknown){
        if(err instanceof Error){
            throw new AuthenticationError(err.message);
        } else {
            throw new AuthenticationError("Authentication error");
        }
    }
}
