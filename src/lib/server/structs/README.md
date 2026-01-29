# src/lib/server/structs

Structs are wrappers around tables in the database and provide an object-oriented way to interact with the data. They encapsulate the logic for creating, reading, updating, and deleting records in the database, as well as are flexible to accommodate complex relationships and behaviors.

## Conventions

```ts
import { Struct } from 'drizzle-struct';
import { attemptAsync } from 'ts-utils';
import { text, integer, boolean } from 'drizzle-orm/pg-core';
import structRegistry from '../services/struct-registry';
// You cannot use $lib imports here because drizzle-orm needs to statically analyze the files

export namespace MyNamespace {
	export const MyStruct = new Struct({
		name: 'my_struct', // must match front-end struct name (if applicable)
		structure: {
			// properties must match front-end struct fields and types
			// all fields must be defined here
			field1: text('field_1').notNull(),
			field2: integer('field_2').notNull(),
			field3: boolean('field_3').notNull()
		}
	});

	// Generate your data types for convenience
	export type MyStructData = typeof MyStruct.sample;
	// there is no DataArr type on the server side.

	// Registers this struct so that it can be used by the front-end
	// If this is not done, the front-end will not have access to data held in this struct
	structRegistry.register(MyStruct);

	export const fn = () => {
		// Please use attemptAsync to handle errors gracefully
		return attemptAsync(async () => {
			// some complex server-side logic
		});
	};
}

// Export table so drizzle-orm can access it
export const _myStructTable = MyNamespace.MyStruct.table;
```
