import '$lib/server/structs/session.js';
import { config } from 'dotenv';
import { Struct } from 'drizzle-struct/back-end';
import '$lib/server/structs/account';
import '$lib/server/structs/permissions';
import '$lib/server/structs/universe';
import { DB } from '$lib/server/db/';
import { handleEvent, connectionEmitter } from '$lib/server/event-handler';
import '$lib/server/utils/files';
import path from 'path';
config();

Struct.each((struct) => {
	if (!struct.built) {
		struct.build(DB);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		struct.eventHandler(handleEvent(struct) as any);
		connectionEmitter(struct);
	}
});

Struct.setupLogger(path.join(process.cwd(), 'logs', 'structs'));
