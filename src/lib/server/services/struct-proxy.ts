import { RedisStructProxyClient, RedisStructProxyServer } from "drizzle-struct/proxy";
import { createClient } from 'redis';

const redisUrl = String(process.env.REDIS_URL || 'reds://localhost:6379');
const redisName = String(process.env.REDIS_NAME);

export const pub = createClient({ url: redisUrl });
export const sub = createClient({ url: redisUrl });

export const proxyServer = new RedisStructProxyServer({
    pub,
    sub,
    name: redisName,
});

export const createProxyClient = <T extends string>(target: T) => {
    return new RedisStructProxyClient({
        pub,
        sub,
        name: redisName,
        target,
    });
};