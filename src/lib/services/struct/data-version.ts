import {
	type Blank,
	Struct,
	type Structable,
	type PartialStructable,
	type GlobalCols,
	type StatusMessage
} from './index';
import { attemptAsync } from 'ts-utils/check';
import { DataAction } from 'drizzle-struct/types';
import { z } from 'zod';
import { WritableBase } from '$lib/utils/writables';

/**
 * Version history of a data, requiring global columns and a version history id and created date
 *
 * @export
 * @typedef {VersionStructable}
 * @template {Blank} T
 */
export type VersionStructable<T extends Blank> = Structable<{
	vhId: 'string';
	vhCreated: 'date';
}> &
	PartialStructable<T & GlobalCols>;

/**
 * Version history point of a data.
 *
 * @export
 * @class StructDataVersion
 * @typedef {StructDataVersion}
 * @template {Blank} T
 */
export class StructDataVersion<T extends Blank> extends WritableBase<PartialStructable<T>> {
	/**
	 * Creates an instance of StructDataVersion.
	 *
	 * @constructor
	 * @param {Struct<T>} struct
	 * @param {PartialStructable<T & GlobalCols & {
	 *         vhId: 'string';
	 *         vhCreated: 'date';
	 *     }>} data
	 */
	constructor(
		public readonly struct: Struct<T>,
		public readonly data: PartialStructable<
			T &
				GlobalCols & {
					vhId: 'string';
					vhCreated: 'date';
				}
		>
	) {
		super(data);
	}

	/**
	 * unique version history id
	 *
	 * @readonly
	 * @type {string}
	 */
	get vhId() {
		return this.data.vhId;
	}

	/**
	 * Id of the data this relates to
	 *
	 * @readonly
	 * @type {string}
	 */
	get id() {
		return this.data.id;
	}

	/**
	 * Date the version was created
	 *
	 * @readonly
	 * @type {Date}
	 */
	get vhCreated() {
		return this.data.vhCreated;
	}

	/**
	 * Date the data was created
	 *
	 * @readonly
	 * @type {string}
	 */
	get created() {
		return this.data.created;
	}

	/**
	 * Date the data was last updated
	 *
	 * @readonly
	 * @type {string}
	 */
	get updated() {
		return this.data.updated;
	}

	/**
	 * Whether the data is archived
	 *
	 * @readonly
	 * @type {boolean}
	 */
	get archived() {
		return this.data.archived;
	}

	/**
	 *  Lifespan of the data in milliseconds
	 *
	 * @readonly
	 * @type {number}
	 */
	get lifetime() {
		return this.data.lifetime;
	}

	/**
	 * Delete the version
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
						.postReq(DataAction.DeleteVersion, {
							id: this.data.id,
							vhId: this.data.vhId
						})
						.then((r) => r.unwrap())
				);
		});
	}

	/**
	 * Restore the version
	 *
	 * @returns {*}
	 */
	restore() {
		return attemptAsync<StatusMessage>(async () => {
			return z
				.object({
					success: z.boolean(),
					message: z.string().optional()
				})
				.parse(
					await this.struct
						.postReq(DataAction.RestoreVersion, {
							id: this.data.id,
							vhId: this.data.vhId
						})
						.then((r) => r.unwrap())
				);
		});
	}
}
