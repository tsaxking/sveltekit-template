import { Limiting } from '../src/lib/server/structs/limiting';
import { Struct } from 'drizzle-struct/back-end';
import { DB } from '../src/lib/server/db/index.js';
import { pathMatch } from '../src/lib/server/utils/file-match.js';

export default async () => {
	await Struct.buildAll(DB).unwrap();

    // await Limiting.PageRuleset.clear().unwrap();

	await Limiting.PageRuleset.new({
	    page: '/',
	    ip: '174.126.232.227'
	}).unwrap();

    // console.log(
    //     await Limiting.PageRuleset.all({ type: 'all' }).unwrap(),
    // );

	// console.log(
	// 	pathMatch(`
    //         /*
    //         !/status/*
    //         !/fuck
    //     `)('/test')
	// );
};
