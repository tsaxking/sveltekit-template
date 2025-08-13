import { RedisStructProxyServer } from "drizzle-struct/proxy";
import { createClient } from 'redis';

export const proxyServer = new RedisStructProxyServer({
    pub: createClient(),
    sub: createClient(),
    name: String(process.env.REDIS_NAME),
});