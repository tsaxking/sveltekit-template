import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as redisModule from '$lib/server/services/redis';
import { z } from 'zod';

// Mock redis createClient and clients
const mockSubscribe = vi.fn();
const mockPublish = vi.fn();
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();

vi.mock('redis', () => {
	return {
		createClient: vi.fn(() => ({
			subscribe: mockSubscribe,
			publish: mockPublish,
			connect: mockConnect,
			disconnect: mockDisconnect,
			isOpen: false,
			isReady: false,
			on: vi.fn()
		}))
	};
});

// Mock uuid to return a fixed value for predictability
vi.mock('../utils/uuid', () => ({
	uuid: vi.fn(() => 'fixed-uuid')
}));

// Mock terminal.warn to track calls
vi.mock('../utils/terminal', () => ({
	default: {
		warn: vi.fn()
	}
}));

describe('Redis namespace', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('connect should call redis connect and subscribe/publish to discovery channels', async () => {
		// Setup mock to simulate clients connecting and being ready
		mockConnect.mockResolvedValue(undefined);
		mockSubscribe.mockImplementation(async (channel, callback) => {
			if (channel === 'discovery:i_am') {
				// Simulate a discovery:i_am message from another instance after subscribing
				setTimeout(() => {
					callback(`default_other-instance:fixed-uuid`);
				}, 0);
			}
			if (channel === 'discovery:welcome') {
				// Simulate a welcome message after subscribing
				setTimeout(() => {
					callback('default_other-instance:fixed-uuid');
				}, 0);
			}
			//   simulate receiving own discovery:i_am message
			if (channel === 'discovery:i_am') {
				callback(`default:${redisModule.Redis.clientId}`);
			}
		});

		// Call connect and expect it resolves without error
		const result = await redisModule.Redis.connect();
		if (!result.isOk()) {
			console.error(result.error);
		}
		expect(result.isOk()).toBe(true);

		// Expect connect was called on both pub and sub clients
		expect(mockConnect).toHaveBeenCalledTimes(2);

		// Expect subscriptions to discovery channels
		expect(mockSubscribe).toHaveBeenCalledWith('discovery:i_am', expect.any(Function));
		expect(mockSubscribe).toHaveBeenCalledWith('discovery:welcome', expect.any(Function));

		// Expect publish to discovery:i_am happened at least once
		expect(mockPublish).toHaveBeenCalledWith(
			'discovery:i_am',
			expect.stringContaining(redisModule.Redis.clientId)
		);
	});

	it('createListeningService should throw if name equals REDIS_NAME', () => {
		const REDIS_NAME = process.env.REDIS_NAME || 'default';
		expect(() => {
			redisModule.Redis.createListeningService(REDIS_NAME, {
				testEvent: z.string()
			});
		}).toThrow();
	});

	it('createListeningService should throw if name contains colon', () => {
		expect(() => {
			redisModule.Redis.createListeningService('bad:name', {
				testEvent: z.string()
			});
		}).toThrow();
	});

	it('createListeningService should emit event on message', () => {
		// Setup: create a ListeningService with an event schema
		const service = redisModule.Redis.createListeningService('testservice', {
			ping: z.string()
		});

		const handler = vi.fn();
		service.on('ping', handler);

		// Simulate a message arriving on the subscribed channel
		const message = JSON.stringify({
			event: 'ping',
			data: 'hello',
			date: new Date().toISOString(),
			id: 42
		});

		// Get the callback passed to subscribe and invoke it
		expect(mockSubscribe).toHaveBeenCalledWith('channel:testservice', expect.any(Function));
		const callback = mockSubscribe.mock.calls.find(
			(call) => call[0] === 'channel:testservice'
		)?.[1];
		if (!callback) throw new Error('Subscribe callback not found');
		callback(message);

		// Check that handler was called with parsed event data
		expect(handler).toHaveBeenCalledWith({
			data: 'hello',
			date: expect.any(Date),
			id: 42
		});
	});

	it('emit should call publish with correctly stringified payload', async () => {
		mockPublish.mockResolvedValue(undefined);

		const result = await redisModule.Redis.emit('testEvent', { foo: 'bar' });
		expect(result.isOk()).toBe(true);

		expect(mockPublish).toHaveBeenCalledWith(
			'channel:' + process.env.REDIS_NAME,
			expect.stringContaining('"event":"testEvent"')
		);
	});
});
