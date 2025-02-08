/* eslint-disable @typescript-eslint/no-explicit-any */
import { DB } from '../db/index';
import { Struct } from 'drizzle-struct/back-end';
import { openStructs } from './struct';
import { Folder } from './utils';
import accounts from './accounts';
import serverController from './server-controller';
import universe from './universe';

export const home = new Folder('Home', 'Root Folder Access', '🏠', [
	serverController,
	accounts,
	universe
]);

Folder.home = home;

openStructs().then(async (s) => {
	s.unwrap();
	(await Struct.buildAll(DB as any)).unwrap();
	// structsPipe();
	home.action();
});
