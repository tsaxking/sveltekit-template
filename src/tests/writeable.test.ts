import {
	WritableArray,
	WritableBase,
	WritableAsync,
	WritableMap,
	WritableSet
} from '$lib/services/writables';
import { sleep } from 'ts-utils';
import { describe, expect, test, vi } from 'vitest';

describe('WritableBase', () => {
	test('subscribes immediately and updates on set/update', async () => {
		const store = new WritableBase(0, {
			debounceMs: 0
		});
		const values: number[] = [];
		const unsubscribe = store.subscribe((value) => values.push(value));

		store.set(1);
		await sleep(10); // wait for debounce to flush
		store.update((value) => value + 1);

		await sleep(10); // wait for debounce to flush

		expect(values).toEqual([0, 1, 2]);
		unsubscribe();
	});

	test('interceptors and validators modify and guard values', () => {
		const store = new WritableBase(1);
		store.intercept((value) => value * 2);
		store.addValidator((value) => value <= 10);

		store.set(3);
		expect(store.data).toBe(6);

		store.set(6);
		expect(store.data).toBe(6);
	});

	test('subscribeOnce fires only once on next emit', async () => {
		const store = new WritableBase(0);
		const values: number[] = [];

		store.subscribeOnce((value) => values.push(value));
		store.set(1);
		await sleep(10);
		store.set(2);
		await sleep(10);

		expect(values).toEqual([1]);
	});

	test('debounces notifications when configured', () => {
		vi.useFakeTimers();

		const store = new WritableBase(0, { debounceMs: 50 });
		const values: number[] = [];
		store.subscribe((value) => values.push(value));

		store.set(1);
		store.set(2);

		expect(values).toEqual([0]);
		vi.advanceTimersByTime(49);
		expect(values).toEqual([0]);
		vi.advanceTimersByTime(1);
		expect(values).toEqual([0, 2]);

		vi.useRealTimers();
	});

	test('inform(true) and _informImmediate notify immediately', () => {
		const store = new WritableBase(0, { debounceMs: 50 });
		const values: number[] = [];
		store.subscribe((value) => values.push(value));

		(store as unknown as { _data: number })._data = 5;
		store.inform(true);
		(store as unknown as { _data: number })._data = 6;
		(store as unknown as { _informImmediate: () => void })._informImmediate();

		expect(values).toEqual([0, 5, 6]);
	});

	test('onAllUnsubscribe runs after last unsubscription', () => {
		const store = new WritableBase(0);
		const calls: number[] = [];
		store.onAllUnsubscribe(() => calls.push(1));

		const unsubscribeA = store.subscribe(() => undefined);
		const unsubscribeB = store.subscribe(() => undefined);

		unsubscribeA();
		expect(calls).toHaveLength(0);

		unsubscribeB();
		expect(calls).toHaveLength(1);
	});

	test('pipe triggers inform when target changes', async () => {
		const source = new WritableBase(0);
		const target = new WritableBase(10);
		const values: number[] = [];

		source.subscribe((value) => values.push(value));
		source.pipe(target);
		await sleep(10);
		target.set(11);
		await sleep(10);

		expect(values).toEqual([0, 0, 0]);
	});

	test('pipeData transforms and updates data from target', async () => {
		const source = new WritableBase('');
		const target = new WritableBase(1);

		source.pipeData(target, (value) => `n:${value}`);
		await sleep(10);
		expect(source.data).toBe('n:1');

		target.set(2);
		await sleep(10);
		expect(source.data).toBe('n:2');
	});

	test('destroy clears subscribers and callbacks', () => {
		const store = new WritableBase(0);
		const values: number[] = [];
		store.subscribe((value) => values.push(value));

		store.destroy();
		store.set(1);

		expect(values).toEqual([0]);
	});

	test('equals compares data for equality', () => {
		const storeA = new WritableBase({ x: 1, y: 2 });
		const storeB = new WritableBase({ x: 1, y: 2 });
		const storeC = new WritableBase({ x: 2, y: 3 });

		expect(storeA.equals(storeB)).toBe(true);
		expect(storeA.equals(storeC)).toBe(false);
	});

	test('Await functionality', async () => {
		const store = new WritableBase(0);
		const promise = store.await().unwrap();

		store.set(42);
		const result = await promise;
		expect(result).toBe(42);
	});
});

describe('WritableArray', () => {
	test('supports array mutations and removals', () => {
		const store = new WritableArray([1, 2, 3]);

		store.push(4);
		expect(store.data).toEqual([1, 2, 3, 4]);

		const popped = store.pop();
		expect(popped).toBe(4);
		expect(store.data).toEqual([1, 2, 3]);

		const shifted = store.shift();
		expect(shifted).toBe(1);
		expect(store.data).toEqual([2, 3]);

		store.unshift(1);
		expect(store.data).toEqual([1, 2, 3]);

		store.splice(1, 1, 9, 8);
		expect(store.data).toEqual([1, 9, 8, 3]);

		store.remove(9, 3);
		expect(store.data).toEqual([1, 8]);

		store.remove((value) => value === 8);
		expect(store.data).toEqual([1]);
	});

	test('applies filter, sort, and reverse to subscriber output', () => {
		const store = new WritableArray([3, 1, 2, 4]);
		const snapshots: number[][] = [];
		store.subscribe((value) => snapshots.push([...value]));

		store.sort((a, b) => a - b).filter((value) => value % 2 === 0);
		expect(snapshots[snapshots.length - 1]).toEqual([2, 4]);

		store.reverse();
		expect(snapshots[snapshots.length - 1]).toEqual([4, 2]);
	});

	test('maps reactively when enabled', () => {
		const source = new WritableArray([1, 2]);
		const mapped = source.map((value) => value * 10);
		let latest: number[] = [];

		mapped.subscribe((value) => {
			latest = value;
		});

		source.push(3);
		expect(latest).toEqual([10, 20, 30]);
	});

	test('creates from iterable and exposes length', () => {
		const store = WritableArray.from(new Set([1, 2, 3]));
		expect(store.length).toBe(3);
		expect(store.data).toEqual([1, 2, 3]);
	});

	test('supports clear, snapshot, and each', () => {
		const store = new WritableArray([1, 2, 3]);
		let sum = 0;
		store.each((value) => {
			sum += value;
		});
		expect(sum).toBe(6);

		const snapshot = store.snapshot();
		expect(snapshot).toEqual([1, 2, 3]);
		expect(snapshot).not.toBe(store.data);

		store.clear();
		expect(store.data).toEqual([]);
	});

	test('inform emits filtered output when called directly', () => {
		const store = new WritableArray([1, 2, 3]);
		store.filter((value) => value > 1);
		const values: number[][] = [];
		store.subscribe((value) => values.push([...value]));
		store.inform();
		expect(values[values.length - 1]).toEqual([2, 3]);
	});

	test('index and move helpers mutate correctly', () => {
		const store = new WritableArray([1, 2, 3]);

		expect(store.setAt(1, 9).isOk()).toBe(true);
		expect(store.data).toEqual([1, 9, 3]);

		expect(store.updateAt(2, (value) => value + 1).isOk()).toBe(true);
		expect(store.data).toEqual([1, 9, 4]);

		expect(store.insertAt(1, 7).isOk()).toBe(true);
		expect(store.data).toEqual([1, 7, 9, 4]);

		expect(store.removeAt(2).isOk()).toBe(true);
		expect(store.data).toEqual([1, 7, 4]);

		expect(store.swap(0, 2).isOk()).toBe(true);
		expect(store.data).toEqual([4, 7, 1]);

		expect(store.move(2, 0).isOk()).toBe(true);
		expect(store.data).toEqual([1, 4, 7]);

		expect(store.replace(1, 8).isOk()).toBe(true);
		expect(store.data).toEqual([1, 8, 7]);
		expect(store.setAt(10, 1).isErr()).toBe(true);
	});

	test('find and findIndex work in reactive and non-reactive modes', async () => {
		const store = new WritableArray([5, 6, 7]);

		expect(store.findIndex((value) => value === 6, false)).toBe(1);
		expect(store.find((value) => value === 7, false)).toBe(7);

		const indexStore = store.findIndex((value) => value === 8, true);
		const itemStore = store.find((value) => value === 8, true);
		const indices: number[] = [];
		const items: Array<number | undefined> = [];
		indexStore.subscribe((value) => indices.push(value));
		itemStore.subscribe((value) => items.push(value));

		store.push(8);
		await sleep(10);

		expect(indices[indices.length - 1]).toBe(3);
		expect(items[items.length - 1]).toBe(8);
	});

	test('toSet and uniqueBy are reactive when enabled', async () => {
		const store = new WritableArray([1, 1, 2, 3]);
		const setStore = store.toSet(true);
		const uniqueStore = store.uniqueBy((value) => value, true);

		expect(Array.from(setStore.data)).toEqual([1, 2, 3]);
		expect(uniqueStore.data).toEqual([1, 2, 3]);

		store.push(2);
		store.push(4);
		await sleep(10);
		expect(Array.from(setStore.data)).toEqual([1, 2, 3, 4]);
		expect(uniqueStore.data).toEqual([1, 2, 3, 4]);
	});

	test('map can be non-reactive', () => {
		const source = new WritableArray([1, 2]);
		const mapped = source.map((value) => value * 2, false);

		source.push(3);
		expect(mapped.data).toEqual([2, 4]);
	});
});

describe('WritableMap', () => {
	test('supports set, delete, has, and clear', async () => {
		const store = new WritableMap<string, number>(new Map());
		store.setKeyValue('a', 1);
		store.setKeyValue('b', 2);

		expect(store.data.get('a')).toBe(1);
		expect(store.has('a', false)).toBe(true);

		const hasStore = store.has('b', true);
		const states: boolean[] = [];
		hasStore.subscribe((value) => states.push(value));

		store.delete('b');
		await sleep(10);
		expect(states[states.length - 1]).toBe(false);

		store.clear();
		expect(store.data.size).toBe(0);
	});
});

describe('WritableSet', () => {
	test('supports add, delete, has, and clear', async () => {
		const store = new WritableSet<number>(new Set());
		store.add(1);
		store.add(2);

		expect(store.data.has(1)).toBe(true);
		expect(store.has(1, false)).toBe(true);

		const hasStore = store.has(2, true);
		const states: boolean[] = [];
		hasStore.subscribe((value) => states.push(value));

		store.delete(2);
		await sleep(10);
		expect(states[states.length - 1]).toBe(false);

		store.clear();
		expect(store.data.size).toBe(0);
	});
});

describe('WritableAsync', () => {
	test('tracks pending and fulfilled states', async () => {
		const store = new WritableAsync<number>({ status: 'idle' });
		const statusStore = store.status(true);
		const resultStore = store.result(true);
		const statuses: Array<'idle' | 'pending' | 'fulfilled' | 'rejected'> = [];
		const results: Array<number | undefined> = [];

		statusStore.subscribe((value) => statuses.push(value));
		resultStore.subscribe((value) => results.push(value));

		store.run(async () => {
			await sleep(10);
			return 42;
		});

		expect(store.status(false)).toBe('pending');
		await sleep(20);
		expect(store.status(false)).toBe('fulfilled');
		expect(store.result(false)).toBe(42);
		expect(statuses[statuses.length - 1]).toBe('fulfilled');
		expect(results[results.length - 1]).toBe(42);
	});

	test('tracks rejected state and exposes error store', async () => {
		const store = new WritableAsync<number>({ status: 'idle' });
		const errorStore = store.error(true);
		const errors: unknown[] = [];
		errorStore.subscribe((value) => errors.push(value));

		store.run(async () => {
			await sleep(5);
			throw new Error('fail');
		});

		await sleep(15);
		expect(store.status(false)).toBe('rejected');
		expect(store.error(false)).toBeInstanceOf(Error);
		expect((errors[errors.length - 1] as Error).message).toBe('fail');
	});

	test('reset clears pending promise and status', async () => {
		const store = new WritableAsync<number>({ status: 'idle' });
		store.run(async () => {
			await sleep(50);
			return 1;
		});

		expect(store.status(false)).toBe('pending');
		store.reset();
		await sleep(5);
		expect(store.status(false)).toBe('idle');
		expect(store.result(false)).toBeUndefined();
	});
});
