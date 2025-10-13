import { ProxyTest } from '../src/lib/server/structs/proxy';
import { DB } from '../src/lib/server/db';
import redis from '../src/lib/server/services/redis';

export default async () => {
    await redis.init().unwrap();
    await ProxyTest.Test.build(DB).unwrap();
    await ProxyTest.redisClient.init().unwrap();

    await ProxyTest.Test.new({
        test: 'Hello, world!',
    }).unwrap();
};