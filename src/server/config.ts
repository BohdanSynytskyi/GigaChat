process.loadEnvFile();


type Config = {
    db_url: string;
    secret: string;
    wss_url: string;
};

export const config: Config = {
   db_url: envOrThrow(process.env.DB_URL), 
   secret: envOrThrow(process.env.SECRET),
   wss_url: envOrThrow(process.env.WSS_URL),
};

function envOrThrow(key: string | undefined) {
    if (typeof key === "string") {
        return key;
    } else {
        throw new Error("One of the environment variables is not set up");
    }
}
