import { DB } from '$lib/server/db';
import { Test } from '$lib/server/structs/testing';
import { StructStream } from 'drizzle-struct/back-end';
import { describe, expect, beforeAll, test } from 'vitest';

describe('Run tests on the Test Struct', () => {
	const T = Test.Test;

	beforeAll(async () => {
		const build = await T.build(DB);
		expect(build.isOk()).toBe(true);

		const clear = await T.clear();
		console.log(clear);
		expect(clear.isOk()).toBe(true);
	});

	test('Emitter', () => {
		let create = false;
		T.on('create', (d) => {
			if (create) return;
			expect(d.data.age).toBe(20);
			create = true;
		});
		let archive = false;
		T.on('archive', (d) => {
			if (archive) return;
			expect(d.data.archived).toBe(true);
			archive = true;
		});
		let remove = false;
		T.on('delete', () => {
			if (remove) return;
			remove = true;
		});
		let deleteVersion = false;
		T.on('delete-version', () => {
			if (deleteVersion) return;
			deleteVersion = true;
		});
		let restore = false;
		T.on('restore', (d) => {
			if (restore) return;
			expect(d.data.archived).toBe(false);
			restore = true;
		});
		let restoreVersion = false;
		T.on('restore-version', () => {
			if (restoreVersion) return;
			restoreVersion = true;
		});
		let update = false;
		T.on('update', (d) => {
			if (update) return;
			expect(d.to.data.age).toBe(21);
			update = true;
		});
	});

	test('Test read/write functionality', async () => {
		const create = (
			await T.new({
				age: 20,
				name: 'John Doe'
			})
		).unwrap();

		expect(create.data.age).toBe(20);
		expect(create.data.name).toBe('John Doe');

		(
			await create.update({
				age: 21
			})
		).unwrap();

		(await create.setArchive(true)).unwrap();
		(await create.setArchive(false)).unwrap();

		expect(
			T.all({
				type: 'stream'
			}) instanceof StructStream
		).toBe(true);

		expect(
			Array.isArray(
				(
					await T.all({
						type: 'array',
						limit: 1,
						offset: 0
					})
				).unwrap()
			)
		).toBe(true);

		expect(
			(
				await T.all({
					type: 'single'
				})
			).unwrap()?.data.age
		).toBe(21);

		expect(
			(
				await T.all({
					type: 'count'
				})
			).unwrap()
		).toBe(1);
	});
});
