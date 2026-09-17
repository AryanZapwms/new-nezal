import Redis from "ioredis";

declare global{
    var _redisClient: Redis | undefined;
}

function createRedisClient(){
    const client = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
        maxRetriesPerRequest: 3,
        retryStrategy(times){
            return Math.min(times * 100, 2000);
        },
    });

    client.on("error", (err) => {
        console.error("[redis] connection error:", err.message);
    });

    return client;
}

const redis = globalThis._redisClient ?? createRedisClient();

if(process.env.NODE_ENV !== "production"){
    globalThis._redisClient = redis;
}

export default redis;

