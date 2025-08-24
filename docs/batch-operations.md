# Custom Batch Operations

This document describes the custom batch operations functionality that allows users to collect multiple struct updates and send them as a single batch request.

## Overview

The batch operations system provides two ways to work with struct updates:

1. **Automatic Batching** (existing): Updates are stored in localStorage and sent periodically via a loop
2. **Custom Batching** (new): Users can manually collect updates and send them when ready

## Key Components

### BatchUpdate Type

```typescript
export type BatchUpdate = {
    struct: string;      // Name of the struct
    type: string;        // Operation type (create, update, delete, etc.)
    data: unknown;       // The data being sent
    id: string;          // Unique identifier for the operation
    date: string;        // ISO timestamp of when the operation was created
};
```

### Core Functions

#### `sendBatch(data: BatchUpdate[])`
Sends an array of batch updates directly to the server.

```typescript
import { sendBatch } from '$lib/services/struct/batching';

const result = await sendBatch(batchUpdates);
if (result.isOk()) {
    console.log('Batch sent successfully:', result.unwrap());
} else {
    console.error('Batch failed:', result.error);
}
```

#### `createBatchCollector()`
Creates a utility for collecting multiple batch updates before sending.

```typescript
import { createBatchCollector } from '$lib/services/struct/batching';

const collector = createBatchCollector();
collector.add(batchUpdate);
const result = await collector.sendAndClear();
```

## Using Batch Mode

All write operations in structs now support an optional `batch` parameter. When `batch=true`, the operation returns a `BatchUpdate` object instead of immediately sending the request.

### Struct Operations

```typescript
// Create a new item in batch mode
const createResult = await struct.new({ name: 'Item 1' }, [], true);
if (createResult.isOk()) {
    const batchUpdate = createResult.unwrap() as BatchUpdate;
    // Collect this for later sending
}
```

### StructData Operations

```typescript
// Update in batch mode
const updateResult = await data.update((current) => ({ 
    ...current, 
    name: 'Updated' 
}), true);

if (updateResult.isOk()) {
    const { batchUpdate } = updateResult.unwrap();
    // Collect this for later sending
}

// Delete in batch mode
const deleteResult = await data.delete(true);

// Archive in batch mode
const archiveResult = await data.setArchive(true, true);

// Set attributes in batch mode
const attributesResult = await data.setAttributes(['tag1', 'tag2'], true);
```

## Usage Patterns

### Pattern 1: Manual Collection

```typescript
const batchUpdates: BatchUpdate[] = [];

// Collect operations
const createResult = await struct.new({ name: 'Item 1' }, [], true);
if (createResult.isOk()) {
    batchUpdates.push(createResult.unwrap() as BatchUpdate);
}

const updateResult = await data.update(current => ({ ...current, updated: true }), true);
if (updateResult.isOk()) {
    batchUpdates.push(updateResult.unwrap().batchUpdate);
}

// Send all at once
const result = await sendBatch(batchUpdates);
```

### Pattern 2: Using Batch Collector

```typescript
const collector = createBatchCollector();

// Add operations to collector
const createResult = await struct.new({ name: 'Item 1' }, [], true);
if (createResult.isOk()) {
    collector.add(createResult.unwrap() as BatchUpdate);
}

const updateResult = await data.update(current => ({ ...current, updated: true }), true);
if (updateResult.isOk()) {
    collector.add(updateResult.unwrap().batchUpdate);
}

// Send all and clear
const result = await collector.sendAndClear();
```

## Benefits

1. **Reduced Network Requests**: Multiple operations are sent in a single HTTP request
2. **Better Performance**: Fewer round trips to the server
3. **Atomic Operations**: Either all operations succeed or all fail together
4. **Flexibility**: Choose when to send updates instead of relying only on automatic timing
5. **Backward Compatibility**: All existing functionality continues to work unchanged

## Migration Guide

The new batch functionality is completely backward compatible. No existing code needs to be changed.

To start using batch operations:

1. Add the optional `batch: true` parameter to your struct operations
2. Collect the returned `BatchUpdate` objects
3. Use `sendBatch()` or the batch collector to send them when ready

## Examples

See `src/lib/examples/batch-operations.ts` for complete working examples of all usage patterns.