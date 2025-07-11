import { DB } from '$lib/server/db';
import { createStructEventService } from '$lib/server/services/struct-event.js';
// import { connectionEmitter, handleEvent } from '$lib/server/event-handler';
import { Test } from '$lib/server/structs/testing';
import terminal from '$lib/server/utils/terminal';
import { fail } from '@sveltejs/kit';

if (!Test.Test.built) {
	Test.Test.build(DB).then((res) => {
		if (res.isErr()) {
			terminal.error(res.error);
		}
	});
	// TODO: make this base on .env?
	Test.Test.bypass('*', () => true);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	createStructEventService(Test.Test as any);
}
