/* eslint-disable @typescript-eslint/no-explicit-any */
import { Struct } from "drizzle-struct/back-end";
import { RedisStructProxyClient } from './test';
import redis from "../services/redis";
import { text } from "drizzle-orm/pg-core";


export namespace ProxyTest {
    export const redisClient = new RedisStructProxyClient({
        target: 'proxy_test_target',
        name: 'proxy_test',
        maxQueueLength: 100,
    }, redis);

    redisClient.on('message', console.log);
    redisClient.on('error', console.error);
    redisClient.on('connect', () => console.log('Redis client connected'));
    redisClient.on('disconnect', () => console.log('Redis client disconnected'));

    export const Test = new Struct({
        name: 'proxy_test',
        structure: {
            test: text('test'),
        },
        proxyClient: redisClient as any,
    });
}