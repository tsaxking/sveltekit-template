/**
 * @fileoverview Struct data wrapper and helpers.
 *
 * @example
 * import { StructData } from '$lib/services/struct/struct-data';
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { attempt, attemptAsync } from 'ts-utils/check';
import {
	Struct,
	type Blank,
	type PartialStructable,
	type GlobalCols,
	StructError,
	DataError,
	type Structable
} from './index';
import { type Readable } from 'svelte/store';
import { StructDataVersion, type VersionStructable } from './data-version';
import { WritableArray, WritableBase } from '$lib/services/writables';
import * as remote from '$lib/remotes/struct.remote';

/**
 * Struct data for a single data point
 *
 * @export
 * @class StructData
 * @typedef {StructData}
 * @template {Blank} T
 * @extends {WritableBase<PartialStructable<T & GlobalCols>>}
 */
export class StructData<T extends Blank> extends WritableBase<PartialStructable<T & GlobalCols>> {
	/**
	 * Creates an instance of StructData.
	 *
	 * @constructor
	 * @param {Struct<T>} struct
	 * @param {(PartialStructable<T & GlobalCols>)} data
	 */
	constructor(
		public readonly struct: Struct<T>,
		data: PartialStructable<T> & PartialStructable<GlobalCols>
	) {
		super(data);
	}

	// this is what will send to the backend
	/**
	 * Update the data in the backend, this will not update the subscribers as the backend will send the update back
	 *
	 * @public
	 * @async
	 * @param {(value: PartialStructable<T & GlobalCols>) => PartialStructable<T & {
	 *         id: 'string';
	 *     }>} fn
	 * @returns {(PartialStructable<T & { id: "string"; }>) => unknown)}
	 */
	public async update(
		fn: (value: PartialStructable<T & GlobalCols>) => PartialStructable<
			T & {
				id: 'string';
			}
		>
	) {
		return attemptAsync(async () => {
			if (!this.data.id) throw new StructError('Unable to update data, no id found');
			const prev = { ...this.data };

			const result = fn(this.data);
			delete result.archived;
			delete result.created;
			delete result.updated;
			delete result.lifetime;
			delete result.universes;
			delete result.attributes;
			delete result.canUpdate;

			await remote.update({
				struct: this.struct.data.name,
				id: this.data.id,
				data: fn(this.data)
			});
			return {
				undo: () => this.update(() => prev)
			};
		});
	}

	/**
	 * Delete the data
	 *
	 * @returns {*}
	 */
	delete() {
		return attemptAsync(async () => {
			if (!this.data.id) throw new Error('No id available to delete data');
			return remote.remove({
				struct: this.struct.data.name,
				id: this.data.id
			});
		});
	}

	/**
	 * Archive or restore the data
	 *
	 * @param {boolean} archive
	 * @returns {*}
	 */
	setArchive(archive: boolean) {
		return attemptAsync(async () => {
			if (!this.data.id) throw new StructError('Unable to archive data, no id found');
			if (archive) {
				await remote.archive({
					struct: this.struct.data.name,
					id: this.data.id
				});
			} else {
				await remote.restoreArchive({
					struct: this.struct.data.name,
					id: this.data.id
				});
			}
		});
	}

	/**
	 * Pull specific properties from the data, if the user does not have permission to read the property it will throw an error.
	 * This is not wrapped in an attempt(() => {}), so you will need to handle errors yourself. This will return a svelte store.
	 *
	 * @template {keyof T} Key
	 * @param {...Key[]} keys
	 * @returns {*}
	 */
	pull<Key extends keyof T>(...keys: Key[]) {
		const o = {} as Structable<{
			[Property in Key]: T[Property];
		}>;

		for (const k of keys) {
			if (typeof this.data[k] === 'undefined') {
				return console.error(
					`User does not have permissions to read ${this.struct.data.name}.${k as string}`
				);
			}
			(o as any)[k] = this.data[k];
		}

		class PartialReadable implements Readable<typeof o> {
			constructor(public data: typeof o) {}

			public readonly subscribers = new Set<(data: typeof o) => void>();

			subscribe(fn: (data: typeof o) => void) {
				this.subscribers.add(fn);
				fn(o);
				return () => {
					this.subscribers.delete(fn);
					if (this.subscribers.size === 0) {
						return u();
					}
				};
			}
		}

		const w = new PartialReadable(o);

		const u = this.subscribe((d) => {
			Object.assign(o, d);
		});

		return w;
	}

	/**
	 * Retrieves all attributes the data has
	 *
	 * @returns {*}
	 */
	getAttributes() {
		return attempt(() => {
			const a = JSON.parse(this.data.attributes || '[]');
			if (!Array.isArray(a)) throw new DataError('Attributes must be an array');
			if (!a.every((i) => typeof i === 'string'))
				throw new DataError('Attributes must be an array of strings');
			return a;
		});
	}

	/**
	 * Retrieves all versions of the data
	 *
	 * @returns {*}
	 */
	getVersions(config?: {
		cache?: {
			expires: Date;
		};
		keys?: (keyof VersionStructable<T>)[];
	}) {
		return attemptAsync(async () => {
			if (!this.data.id) throw new StructError('Unable to get versions, no id found');
			const versions = await remote.versionHistory({
				struct: this.struct.data.name,
				id: this.data.id,
				keys: config?.keys?.map(String) || []
			});

			return new WritableArray(
				versions.items.map((v) => new StructDataVersion(this.struct, v as any))
			);
		});
	}

	staging() {
		return this.struct.Stage(this);
	}
}
