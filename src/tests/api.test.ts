import { Server, Client } from 'drizzle-struct/reflection';
import { describe, test, assert } from 'vitest';
import { Test } from '../lib/server/structs/testing';
import { DB } from '../lib/server/db';
import { CachedEvents } from 'drizzle-struct/cached-events';
import path from 'path';
import { Struct } from 'drizzle-struct/back-end';



Struct.setupLogger(path.join(process.cwd(), './test-results/logs'));


const PORT = 3000;
const HOST = 'localhost';
const FILE_DIR = 'src/tests/files';

describe('API Testing Suite', async () => {
    // return test('Bypass', () => assert(true));
    await Test.API.build(DB);
    await CachedEvents.Events.build(DB);

    const s = new Server({
        port: PORT,
        checkAPI: (key) => key === 'test',
        checkEvent: () => true,
        fileStreamDir: FILE_DIR,
        logFile: path.join(process.cwd(), './test-results/server.log'),
    });

    s.start();

    const c = new Client({
        port: PORT,
        host: HOST,
        https: false,
        apikey: 'test',
        fileStreamDir: FILE_DIR,
        logFile: path.join(process.cwd(), './test-results/client.log'),
    });

    (await c.start()).unwrap();

    Test.API.startReflection(s).unwrap();
    Test.API.startReflection(c).unwrap();

    (await Test.API.clear()).unwrap();

    // test('Bypass', () => assert(true));

    // const serverEm = s.getEmitter(Test.ServerAPI);
    // const clientEm = c.getEmitter(Test.ClientAPI);

    test('Pinger', async () => {
        const p = (await c.ping()).unwrap();
        console.log(await p.text());

        assert(p.status === 200);
    });


    // test('Send something to server', async () => {
    //     await new Promise<void>((res, rej) => {
    //         Test.API.new({
    //             name: 'Test',
    //             age: 30,
    //         }).then(d => (d.unwrap())).catch(rej);

    //         setTimeout(() => {
    //             rej('Timeout');
    //         }, 1000);
    //     });
    // });
});