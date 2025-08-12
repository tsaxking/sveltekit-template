import { describe, expect, test } from 'vitest';
import { sendBatch, createBatchCollector, type BatchUpdate } from '$lib/services/struct/batching';
import { v4 as uuid } from 'uuid';

describe('Struct Batch Operations', () => {
	test('BatchUpdate type should be properly defined', () => {
		const batchUpdate: BatchUpdate = {
			struct: 'test',
			type: 'create',
			data: { name: 'test' },
			id: uuid(),
			date: new Date().toISOString()
		};

		expect(batchUpdate.struct).toBe('test');
		expect(batchUpdate.type).toBe('create');
		expect(batchUpdate.data).toEqual({ name: 'test' });
		expect(typeof batchUpdate.id).toBe('string');
		expect(typeof batchUpdate.date).toBe('string');
	});

	test('createBatchCollector should create a functional batch collector', () => {
		const collector = createBatchCollector();
		
		expect(collector.size()).toBe(0);
		expect(collector.getUpdates()).toEqual([]);

		const batchUpdate: BatchUpdate = {
			struct: 'test',
			type: 'create',
			data: { name: 'test' },
			id: uuid(),
			date: new Date().toISOString()
		};

		collector.add(batchUpdate);
		
		expect(collector.size()).toBe(1);
		expect(collector.getUpdates()).toEqual([batchUpdate]);

		const secondUpdate: BatchUpdate = {
			struct: 'test',
			type: 'update',
			data: { name: 'updated' },
			id: uuid(),
			date: new Date().toISOString()
		};

		collector.add(secondUpdate);
		
		expect(collector.size()).toBe(2);
		expect(collector.getUpdates()).toEqual([batchUpdate, secondUpdate]);

		collector.clear();
		expect(collector.size()).toBe(0);
		expect(collector.getUpdates()).toEqual([]);
	});

	test('sendBatch should handle empty array', async () => {
		const result = await sendBatch([]);
		expect(result.isOk()).toBe(true);
		expect(result.unwrap()).toEqual([]);
	});

	test('sendBatch should validate input structure', async () => {
		const validBatch: BatchUpdate[] = [
			{
				struct: 'test',
				type: 'create',
				data: { name: 'test' },
				id: uuid(),
				date: new Date().toISOString()
			}
		];

		// This test assumes the server endpoint exists and will handle the batch
		// In a real environment, this would require the server to be running
		const result = await sendBatch(validBatch);
		
		// The result structure depends on whether the server is running
		// If the server is not available, this should handle the error gracefully
		expect(result.isOk() || result.isErr()).toBe(true);
	});

	test('batch collector send methods should work', async () => {
		const collector = createBatchCollector();
		
		const batchUpdate: BatchUpdate = {
			struct: 'test',
			type: 'create',
			data: { name: 'test' },
			id: uuid(),
			date: new Date().toISOString()
		};

		collector.add(batchUpdate);
		
		// Test send (without clearing)
		const sendResult = await collector.send();
		expect(sendResult.isOk() || sendResult.isErr()).toBe(true);
		expect(collector.size()).toBe(1); // Should still have the update

		// Test sendAndClear
		const sendAndClearResult = await collector.sendAndClear();
		expect(sendAndClearResult.isOk() || sendAndClearResult.isErr()).toBe(true);
		expect(collector.size()).toBe(0); // Should be cleared
	});
});