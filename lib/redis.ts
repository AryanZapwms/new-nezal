import Redis from "ioredis";

declare global{
    var _redisClient: Redis | undefined;
}

function createRedisClient(){
    let hasLoggedError = false;

    const client = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        retryStrategy(times){
            if(times > 3) return null;
            return Math.min(times * 100, 2000);
        },
    });

    client.on("error", (err) => {
        if(hasLoggedError) return;
        hasLoggedError = true;
        console.error("[redis] connection error:", err.message);
    });

    client.on("ready", () => {
        hasLoggedError = false;
    });

    return client;
}

const redis = globalThis._redisClient ?? createRedisClient();

if(process.env.NODE_ENV !== "production"){
    globalThis._redisClient = redis;
}

export default redis;

