/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Redis } from '$lib/server/services/redis';
import { z } from 'zod';

vi.mock('redis', () => {
  // Mock Redis createClient with stubbed methods
  const subscribeCallbacks = new Map<string, Function>();

  const createClient = vi.fn(() => ({
    isOpen: true,
    isReady: true,
    connect: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn((channel: string, cb: Function) => {
      subscribeCallbacks.set(channel, cb);
      return Promise.resolve();
    }),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
    rPush: vi.fn().mockResolvedValue(undefined),
    blPop: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(undefined),
    lLen: vi.fn().mockResolvedValue(0),
    on: vi.fn(),
  }));

  return { createClient };
});

describe('Redis namespace', () => {
  beforeEach(() => {
    // Reset _sub, _pub before each test
    Redis._sub = undefined;
    Redis._pub = undefined;
  });

  it('connect() connects clients and resolves on discovery', async () => {
    // Arrange: after connect, simulate discovery message from other instance
    const subCallbacks: Record<string, Function> = {};
    const pubCalls: Array<{channel: string; message: string}> = [];

    // Setup mocks
    Redis._sub = {
      isOpen: false,
      isReady: false,
      connect: vi.fn().mockImplementation(async () => {
        Redis._sub!.isOpen = true;
        Redis._sub!.isReady = true;
      }),
      subscribe: vi.fn().mockImplementation(async (channel, cb) => {
        subCallbacks[channel] = cb;
      }),
      on: vi.fn(),
    } as any;

    Redis._pub = {
      isOpen: false,
      isReady: false,
      connect: vi.fn().mockImplementation(async () => {
        Redis._pub!.isOpen = true;
        Redis._pub!.isReady = true;
      }),
      publish: vi.fn().mockImplementation(async (channel, message) => {
        pubCalls.push({ channel, message });
      }),
      on: vi.fn(),
    } as any;

    // Spy on console.log to suppress output or test logs if desired
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const connectPromise = Redis.connect();

    // Simulate receiving the "discovery:i_am" message from another instance
    await new Promise((r) => setTimeout(r, 10)); // Let connect start subscribing

    expect(subCallbacks['discovery:i_am']).toBeDefined();
    expect(subCallbacks['discovery:welcome']).toBeDefined();

    // Simulate a message from another instance (different clientId)
    subCallbacks['discovery:i_am']!(Redis.REDIS_NAME + ':some-other-id');

    // Await connect promise resolution
    await expect(connectPromise).resolves.toBeUndefined();

    // Ensure publish to discovery:welcome happened
    expect(pubCalls.some((c) => c.channel === 'discovery:welcome')).toBe(true);
  });

  it('emit() publishes a message with incrementing id', async () => {
    const published: any[] = [];

    Redis._pub = {
      publish: vi.fn().mockImplementation(async (channel, message) => {
        published.push({ channel, message });
      }),
    } as any;

    await Redis.emit('testEvent', { foo: 'bar' });

    expect(published.length).toBe(1);
    const pub = published[0];
    expect(pub.channel).toBe('channel:' + (process.env.REDIS_NAME || 'default'));
    const msg = JSON.parse(pub.message);
    expect(msg.event).toBe('testEvent');
    expect(msg.data).toEqual({ foo: 'bar' });
    expect(typeof msg.id).toBe('number');
  });

  it('createListeningService subscribes and emits events', async () => {
    const subscribedCallbacks: Record<string, Function> = {};

    Redis._sub = {
      subscribe: vi.fn().mockImplementation(async (channel, cb) => {
        subscribedCallbacks[channel] = cb;
      }),
      on: vi.fn(),
    } as any;

    Redis._pub = {
      publish: vi.fn(),
    } as any;

    const schema = {
      foo: z.string(),
    };

    const service = Redis.createListeningService('myService', { myEvent: z.object(schema) });

    // Setup event listener
    let receivedData: any = null;
    service.on('myEvent', (payload) => {
      receivedData = payload;
    });

    // Simulate a message coming in on subscription channel
    const message = JSON.stringify({
      event: 'myEvent',
      data: { foo: 'hello' },
      date: new Date().toISOString(),
      id: 1,
    });

    subscribedCallbacks['channel:myService'](message);

    // Allow event loop to process
    await new Promise((r) => setTimeout(r, 0));

    expect(receivedData).not.toBeNull();
    expect(receivedData.data).toEqual({ foo: 'hello' });
    expect(receivedData.id).toBe(1);
    expect(receivedData.date instanceof Date).toBe(true);
  });

  it('request() sends query and resolves with valid response', async () => {
    const subscribeCallbacks: Record<string, Function> = {};

    Redis._sub = {
      subscribe: vi.fn().mockImplementation(async (channel, cb) => {
        subscribeCallbacks[channel] = cb;
      }),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
    } as any;

    Redis._pub = {
      publish: vi.fn().mockResolvedValue(undefined),
    } as any;

    const responseData = { message: 'ok' };
    const returnType = z.object({ message: z.string() });

    const promise = Redis.request('myService', 'getData', { param: 42 }, returnType, 1000);

    // Extract the response channel from the subscribeCallbacks keys (the one with "response:")
    const responseChannel = Object.keys(subscribeCallbacks).find((ch) => ch.startsWith('response:'));
    expect(responseChannel).toBeDefined();

    // Simulate response published to response channel
    const responseMessage = JSON.stringify({
      data: responseData,
      date: new Date().toISOString(),
      id: 1,
    });

    // Trigger response subscription
    subscribeCallbacks[responseChannel!](responseMessage);

    const result = await promise;
    expect(result).toEqual(responseData);
  });

  it('enqueue and dequeue works with mocked redis list commands', async () => {
    let queue: string[] = [];
    Redis._pub = {
      rPush: vi.fn().mockImplementation(async (_, task) => {
        queue.push(task);
      }),
      publish: vi.fn().mockResolvedValue(undefined),
      del: vi.fn().mockResolvedValue(undefined),
      lLen: vi.fn().mockImplementation(async () => queue.length),
    } as any;

    Redis._sub = {
      blPop: vi.fn().mockImplementation(async () => {
        if (queue.length === 0) return null;
        return { element: queue.shift() };
      }),
    } as any;

    const task = { id: 123, action: 'doSomething' };
    await Redis.enqueue('myQueue', task, true);

    expect(queue.length).toBe(1);

    const dequeued = await Redis.dequeue('myQueue', z.object({ id: z.number(), action: z.string() }), 0);
    expect(dequeued).toEqual(task);

    const length = await Redis.getQueueLength('myQueue');
    expect(length).toBe(0);

    await Redis.clearQueue('myQueue');
    expect(queue.length).toBe(0);
  });

  it('emitStream emits stream data and end', async () => {
    const events: any[] = [];
    Redis._pub = {
      publish: vi.fn().mockImplementation(async (channel, message) => {
        events.push({ channel, message });
      }),
    } as any;

    // Create a mock stream that calls on('data') and once('end') handlers
    const dataListeners: Function[] = [];
    const endListeners: Function[] = [];

    const mockStream = {
      on: (event: string, cb: Function) => {
        if (event === 'data') dataListeners.push(cb);
      },
      once: (event: string, cb: Function) => {
        if (event === 'end') endListeners.push(cb);
      },
      await: () => ({
        unwrap: () => Promise.resolve(),
      }),
    } as any;

    // Call emitStream but it waits on stream.await().unwrap()
    const emitPromise = Redis.emitStream('myStream', mockStream);

    // Trigger data event
    dataListeners.forEach((cb) => cb({ foo: 'bar' }));
    // Trigger end event
    endListeners.forEach((cb) => cb());

    await emitPromise;

    expect(events.some(e => e.channel === 'stream:myStream')).toBe(true);

    // Check that data event was published
    const dataEvent = events.find(e => e.message.includes('"data":{"foo":"bar"}'));
    expect(dataEvent).toBeDefined();

    // Check that end event was published
    const endEvent = events.find(e => {
      try {
        const parsed = JSON.parse(e.message);
        return !('data' in parsed) && 'id' in parsed && 'date' in parsed;
      } catch {
        return false;
      }
    });
    expect(endEvent).toBeDefined();
  });

  it('listenStream subscribes and calls handler and onEnd', async () => {
    let handlerCalled = false;
    let endCalled = false;

    Redis._sub = {
      subscribe: vi.fn().mockImplementation(async (_, cb) => {
        // simulate sending stream data message
        setTimeout(() => {
          cb(
            JSON.stringify({
              data: { foo: 'hello' },
              date: new Date().toISOString(),
              packet: 0,
              id: 1,
            })
          );
          // simulate end message
          cb(
            JSON.stringify({
              id: 1,
              date: new Date().toISOString(),
            })
          );
        }, 10);
      }),
    } as any;

    const schema = z.object({ foo: z.string() });

    await Redis.listenStream('testStream', schema,
      (data) => {
        handlerCalled = true;
        expect(data.foo).toBe('hello');
      },
      () => {
        endCalled = true;
      }
    );

    await new Promise((r) => setTimeout(r, 20)); // wait for async events

    expect(handlerCalled).toBe(true);
    expect(endCalled).toBe(true);
  });
});
