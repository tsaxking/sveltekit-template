import { DB } from "../lib/server/db";
import { Test } from "../lib/server/structs/testing";
import { assert, describe, test } from "vitest";

describe('Struct Testing Suite', async () => {
    (await Test.Test.build(DB)).unwrap();

    test('Utilization', async () => {
        (await Test.Test.clear()).unwrap();


        const d1 = (await Test.Test.new({
            name: 'Test 1',
            age: 20,
        })).unwrap();

        const exists = (await Test.Test.fromId(d1.id)).unwrap();
        assert(exists?.data.name === 'Test 1');

        (await d1.update({
            age: 21,
        })).unwrap();

        const d2 = (await Test.Test.fromId(d1.id)).unwrap();

        assert(d2?.data.age === 21);

        const all = (await Test.Test.all({
            limit: 1,
            offset: 0,
            type: 'array',
        })).unwrap();

        assert(all.length === 1);

        const versions = (await d1.getVersions()).unwrap();
        assert(versions.length > 0);


        (await d1.delete()).unwrap();

        const missing = (await Test.Test.fromId(d1.id)).unwrap();
        assert(!missing);
    });
});