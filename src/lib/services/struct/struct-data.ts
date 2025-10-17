import { attempt, attemptAsync } from 'ts-utils/check';
import {
	Struct,
	type Blank,
	type PartialStructable,
	type GlobalCols,
	StructError,
	DataError,
	type StatusMessage,
	type Structable
} from './index';
import { type Writable, type Readable } from 'svelte/store';
import { DataAction, PropertyAction } from 'drizzle-struct/types';
import { z } from 'zod';
import { StructDataVersion, type VersionStructable } from './data-version';

/**
 * Struct data for a single data point
 *
 * @export
 * @class StructData
 * @typedef {StructData}
 * @template {Blank} T
 * @implements {Writable<PartialStructable<T & GlobalCols>>}
 */
export class StructData<T extends Blank> implements Writable<PartialStructable<T & GlobalCols>> {
	/**
	 * Creates an instance of StructData.
	 *
	 * @constructor
	 * @param {Struct<T>} struct
	 * @param {(PartialStructable<T & GlobalCols>)} data
	 */
	constructor(
		public readonly struct: Struct<T>,
		public data: PartialStructable<T> & PartialStructable<GlobalCols>
	) {}

	/**
	 * Svelte store subscribers, used to automatically update the view
	 *
	 * @private
	 * @type {*}
	 */
	private subscribers = new Set<(value: PartialStructable<T & GlobalCols>) => void>();

	/**
	 * Subscribe to the data
	 *
	 * @public
	 * @param {(value:  PartialStructable<T & GlobalCols>) => void} fn
	 * @returns {() => void}
	 */
	public subscribe(fn: (value: PartialStructable<T & GlobalCols>) => void): () => void {
		this.subscribers.add(fn);
		fn(this.data);
		return () => {
			this.subscribers.delete(fn);
		};
	}

	// this is what will set in the store
	/**
	 * Sets the data and updates the subscribers, this will not update the backend
	 *
	 * @public
	 * @param {(PartialStructable<T & GlobalCols>)} value
	 */
	public set(value: PartialStructable<T & GlobalCols>): void {
		this.data = value;
		this.subscribers.forEach((fn) => fn(value));
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

			const res = (
				await this.struct.postReq(PropertyAction.Update, {
					data: result,
					id: this.data.id
				})
			).unwrap();
			return {
				result: (await res.json()) as StatusMessage,
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
		return attemptAsync<StatusMessage>(async () => {
			return z
				.object({
					success: z.boolean(),
					message: z.string().optional()
				})
				.parse(
					await this.struct
						.postReq(DataAction.Delete, {
							id: this.data.id
						})
						.then((r) => r.unwrap().json())
				);
		});
	}

	/**
	 * Archive or restore the data
	 *
	 * @param {boolean} archive
	 * @returns {*}
	 */
	setArchive(archive: boolean) {
		return attemptAsync<StatusMessage>(async () => {
			if (archive) {
				return z
					.object({
						success: z.boolean(),
						message: z.string().optional()
					})
					.parse(
						await this.struct
							.postReq(DataAction.Archive, {
								id: this.data.id
							})
							.then((r) => r.unwrap().json())
					);
			}
			return z
				.object({
					success: z.boolean(),
					message: z.string().optional()
				})
				.parse(
					await this.struct
						.postReq(DataAction.RestoreArchive, {
							id: this.data.id
						})
						.then((r) => r.unwrap().json())
				);
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
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
	 * Sets the attributes of the data, this will overwrite any existing attributes.
	 *
	 * @param {string[]} attributes
	 * @returns {*}
	 */
	setAttributes(attributes: string[]) {
		return attemptAsync(async () => {
			if (!this.data.id) throw new StructError('Unable to set attributes, no id found');
			if (!Array.isArray(attributes)) {
				throw new DataError('Attributes must be an array of strings');
			}
			if (!attributes.every((a) => typeof a === 'string')) {
				throw new DataError('Attributes must be an array of strings');
			}

			const res = await this.struct
				.postReq(PropertyAction.SetAttributes, {
					id: this.data.id,
					attributes
				})
				.unwrap();

			const result = (await res.json()) as StatusMessage<string[]>;
			if (!result.success) {
				throw new DataError(result.message || 'Failed to set attributes');
			}

			this.data.attributes = JSON.stringify(result.data);
			return this.getAttributes().unwrap();
		});
	}

	/**
	 * Adds new attributes to the data, this will not overwrite existing attributes.
	 *
	 * @param {...string[]} attributes
	 * @returns {*}
	 */
	addAttributes(...attributes: string[]) {
		return attemptAsync(async () => {
			const current = this.getAttributes().unwrap();
			return this.setAttributes(Array.from(new Set([...current, ...attributes]))).unwrap();
		});
	}

	/**
	 * Removes attributes from the data, this will not throw an error if the attribute does not exist.
	 *
	 * @param {...string[]} attributes
	 * @returns {*}
	 */
	removeAttributes(...attributes: string[]) {
		return attemptAsync(async () => {
			const current = this.getAttributes().unwrap();
			const newAttributes = current.filter((a) => !attributes.includes(a));
			return this.setAttributes(newAttributes).unwrap();
		});
	}

	/**
	 * Retrieves all versions of the data
	 *
	 * @returns {*}
	 */
	getVersions() {
		return attemptAsync(async () => {
			const versions = (await this.struct
				.getReq(PropertyAction.ReadVersionHistory, {
					id: this.data.id
				})
				.then((r) => r.unwrap().json())) as StatusMessage<VersionStructable<T>[]>;

			if (!versions.success) {
				throw new DataError(versions.message || 'Failed to get versions');
			}

			return versions.data?.map((v) => new StructDataVersion(this.struct, v)) || [];
		});
	}
}
