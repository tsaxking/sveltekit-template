import { Struct } from 'drizzle-struct/back-end';
import { Test } from '../src/lib/server/structs/testing';
import { DB } from '../src/lib/server/db';
import { Search } from 'drizzle-struct/search';


export default async () => {
    await Struct.buildAll(DB).unwrap();

    await Promise.all(Array.from({ length: 100 }).map(async (_, i) => {
        await Test.Test.new({
            name: `User ${i}`,
            age: Math.floor(Math.random() * 50) + 10,
        }).unwrap();
    }));
    // const results = await Test.Test.search()
    //     .where('age', 'contains', 330)
    //     .or(r => r)
    //     .sql;
    const results = await Search.fromNode(Test.Test,{
  type: 'group',
  op: 'and',
  nodes: [ { type: 'condition', col: 'name', op: '<', value: '50' } ]
});
    // .array({
    //     offset: 0,
    //     limit: 10,
    // }).unwrap();

    const s = DB.select().from(Test.Test.table).where(results.sql).toSQL();
    console.log(s);

    // console.log(results);

    // console.log(results.length);
};