/* eslint-disable @typescript-eslint/no-explicit-any */
import { DB } from '../src/lib/server/db/index';
import { Struct } from 'drizzle-struct/back-end';
import { openStructs } from './struct';
import { Folder } from './utils';
import accounts from './accounts';
import serverController from './server-controller';
import pageLimiting from './page-limiting';

export const home = new Folder('Home', 'Root Folder Access', '🏠', [
	serverController,
	accounts,
	pageLimiting
]);

Folder.home = home;

openStructs().then(async (s) => {
	s.unwrap();
	await import('../src/lib/server/index');
	(await Struct.buildAll(DB as any)).unwrap();
	// structsPipe();
	home.action();
});
