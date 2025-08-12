/**
 * Example demonstrating custom batch operations usage
 * 
 * This file shows how to use the new batch functionality to collect multiple
 * struct operations and send them as a single batch request.
 */

import { createBatchCollector, sendBatch, type BatchUpdate } from '$lib/services/struct/batching';
import type { Struct, StructData } from '$lib/services/struct';

// Example usage patterns for custom batch operations

/**
 * Example 1: Using batch mode with individual operations
 */
async function exampleIndividualBatchOperations() {
	// Assume we have a struct and some data
	const struct: Struct<any> = {} as any; // Your struct instance
	const data: StructData<any> = {} as any; // Your struct data instance

	// Collect batch updates manually
	const batchUpdates: BatchUpdate[] = [];

	// Create a new item in batch mode
	const createResult = await struct.new({ name: 'Item 1' }, [], true);
	if (createResult.isOk()) {
		batchUpdates.push(createResult.unwrap() as BatchUpdate);
	}

	// Update an existing item in batch mode
	const updateResult = await data.update((current) => ({ ...current, name: 'Updated Item' }), true);
	if (updateResult.isOk()) {
		const result = updateResult.unwrap() as { batchUpdate: BatchUpdate };
		batchUpdates.push(result.batchUpdate);
	}

	// Archive an item in batch mode
	const archiveResult = await data.setArchive(true, true);
	if (archiveResult.isOk()) {
		batchUpdates.push(archiveResult.unwrap() as BatchUpdate);
	}

	// Send all operations as a single batch
	const sendResult = await sendBatch(batchUpdates);
	if (sendResult.isOk()) {
		console.log('Batch sent successfully:', sendResult.unwrap());
	} else {
		console.error('Batch failed:', sendResult.error);
	}
}

/**
 * Example 2: Using the batch collector utility
 */
async function exampleBatchCollector() {
	// Create a batch collector
	const collector = createBatchCollector();

	// Assume we have a struct and some data
	const struct: Struct<any> = {} as any; // Your struct instance
	const data: StructData<any> = {} as any; // Your struct data instance

	// Add operations to the collector
	const createResult = await struct.new({ name: 'Item 1' }, [], true);
	if (createResult.isOk()) {
		collector.add(createResult.unwrap() as BatchUpdate);
	}

	const updateResult = await data.update((current) => ({ ...current, name: 'Updated Item' }), true);
	if (updateResult.isOk()) {
		const result = updateResult.unwrap() as { batchUpdate: BatchUpdate };
		collector.add(result.batchUpdate);
	}

	const deleteResult = await data.delete(true);
	if (deleteResult.isOk()) {
		collector.add(deleteResult.unwrap() as BatchUpdate);
	}

	// Check how many operations we have
	console.log(`Collected ${collector.size()} operations`);

	// Send all operations and clear the collector
	const sendResult = await collector.sendAndClear();
	if (sendResult.isOk()) {
		console.log('Batch sent successfully:', sendResult.unwrap());
		console.log(`Collector now has ${collector.size()} operations`); // Should be 0
	} else {
		console.error('Batch failed:', sendResult.error);
	}
}

/**
 * Example 3: Working with attributes in batch mode
 */
async function exampleAttributeBatching() {
	const collector = createBatchCollector();
	const data: StructData<any> = {} as any; // Your struct data instance

	// Set attributes in batch mode
	const setAttributesResult = await data.setAttributes(['tag1', 'tag2'], true);
	if (setAttributesResult.isOk()) {
		collector.add(setAttributesResult.unwrap() as BatchUpdate);
	}

	// Add more attributes in batch mode
	const addAttributesResult = await data.addAttributes(['tag3'], true);
	if (addAttributesResult.isOk()) {
		collector.add(addAttributesResult.unwrap() as BatchUpdate);
	}

	// Remove some attributes in batch mode
	const removeAttributesResult = await data.removeAttributes(['tag1'], true);
	if (removeAttributesResult.isOk()) {
		collector.add(removeAttributesResult.unwrap() as BatchUpdate);
	}

	// Send all attribute operations as a batch
	const result = await collector.sendAndClear();
	console.log('Attribute batch result:', result);
}

/**
 * Example 4: Mixed operations with error handling
 */
async function exampleWithErrorHandling() {
	const collector = createBatchCollector();
	
	try {
		// Assume we have multiple struct instances and data
		const struct1: Struct<any> = {} as any;
		const struct2: Struct<any> = {} as any;
		const data1: StructData<any> = {} as any;
		const data2: StructData<any> = {} as any;

		// Collect various operations from different structs
		const operations = await Promise.allSettled([
			struct1.new({ name: 'Item from struct1' }, [], true),
			struct2.new({ title: 'Item from struct2' }, [], true),
			data1.update((current) => ({ ...current, updated: true }), true),
			data2.setArchive(true, true)
		]);

		// Add successful operations to the collector
		operations.forEach((operation, index) => {
			if (operation.status === 'fulfilled' && operation.value.isOk()) {
				const batchUpdate = operation.value.unwrap() as BatchUpdate;
				collector.add(batchUpdate);
			} else {
				console.warn(`Operation ${index} failed:`, operation);
			}
		});

		if (collector.size() > 0) {
			console.log(`Sending batch with ${collector.size()} operations`);
			const result = await collector.sendAndClear();
			
			if (result.isOk()) {
				const responses = result.unwrap();
				responses.forEach((response: any, index: number) => {
					if (response.success) {
						console.log(`Operation ${index} succeeded:`, response.message);
					} else {
						console.error(`Operation ${index} failed:`, response.message);
					}
				});
			} else {
				console.error('Entire batch failed:', result.error);
			}
		} else {
			console.log('No operations to send');
		}
	} catch (error) {
		console.error('Unexpected error in batch operations:', error);
	}
}

// Export the examples for use in documentation or testing
export {
	exampleIndividualBatchOperations,
	exampleBatchCollector,
	exampleAttributeBatching,
	exampleWithErrorHandling
};