import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Redis } from '$lib/server/services/redis';
import { z } from 'zod';
import { Stream } from 'ts-utils/stream';

describe('Redis namespace', () => {
	const REDIS_NAME = process.env.REDIS_NAME;
	if (!REDIS_NAME) {
		throw new Error('REDIS_NAME environment variable is not set');
	}

	beforeEach(async () => {
		const connectRes = await Redis.connect();
		if (connectRes.isErr()) {
			throw new Error(`Redis connect failed: ${connectRes.error}`);
		}
	});

	it('connect() connects clients and resolves on discovery', async () => {
		expect(Redis._sub).toBeDefined();
		expect(Redis._pub).toBeDefined();
		expect(Redis._sub!.isOpen).toBe(true);
		expect(Redis._pub!.isOpen).toBe(true);
		expect(Redis._sub!.isReady).toBe(true);
		expect(Redis._pub!.isReady).toBe(true);
	});

	it('createListeningService subscribes and emits events', async () => {
		const service = Redis.createListeningService(REDIS_NAME, {
			testEvent: z.object({ foo: z.string() })
		});

		const p = new Promise<void>((res) => {
			service.on('testEvent', (data) => {
				expect(data.data.foo).toBe('bar');
				expect(data.date).toBeDefined();
				expect(data.id).toBeDefined();
				res();
			});
		});

		Redis.emit('testEvent', { foo: 'bar' });
		await p;
	});

	it('request() sends query and resolves with valid response', async () => {
		const responder = new Promise((res) => {
			Redis.queryListen(REDIS_NAME, 'testEvent', z.object({ foo: z.string() }), (data) => {
				res(data);
				return data.data;
			});
		});

		const requester = Redis.query(
			REDIS_NAME,
			'testEvent',
			{ foo: 'bar' },
			z.object({ foo: z.string() })
		);

		const [req, resResult] = await Promise.all([responder, requester]);
		if (resResult.isErr()) {
			throw new Error(`Request failed: ${resResult.error}`);
		}
		expect(resResult.isOk()).toBe(true);

		expect(req).toBeDefined();
		expect(resResult.value.foo).toBe('bar');
	});

	// TODO: fix this unit test

	// it('queueService creates a fifo queue stack', async () => {
	// 	const service = Redis.createQueueService('testQueue', z.object({ number: z.number() }));
	// 	expect(service).toBeDefined();

	// 	const received: number[] = [];
	// 	const numbers = [1, 2, 3, 4, 5];
	// 	const p = new Promise<void>((res, rej) => {
	// 		service.on('data', data => {
	// 			received.push(data.number);
	// 			if (received.length === numbers.length) {
	// 				res();
	// 			}
	// 		});

	// 		setTimeout(() => {
	// 			rej();
	// 		}, 1000); // Allow time for processing
	// 	});

	// 	service.start();

	// 	for (const num of numbers) {
	// 		await service.put({ number: num });
	// 	}

	// 	await p;

	// 	expect(received).toEqual(numbers);
	// });

	it('emitStream emits stream data and end', async () => {
		const stream = new Stream<number>();
		Redis.emitStream('testStream', stream);
		const chunks: number[] = Array.from({ length: 5 }, (_, i) => i + 1);
		const received: number[] = [];

		const p = new Promise<void>((res) => {
			Redis.listenStream(
				'testStream',
				z.number(),
				(chunk) => received.push(chunk),
				() => res()
			);
		});

		for (const chunk of chunks) {
			stream.add(chunk);
		}
		stream.end();
		await p;
		expect(received).toEqual(chunks);
	}, {
		timeout: 10_000,
	});
});
