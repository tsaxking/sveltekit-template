/**
 * @fileoverview Struct data version wrappers.
 *
 * @example
 * import { StructDataVersion } from '$lib/services/struct/data-version';
 */
import {
	type Blank,
	Struct,
	type Structable,
	type PartialStructable,
	type GlobalCols
} from './index';
import { attemptAsync } from 'ts-utils/check';
import { WritableBase } from '$lib/services/writables';
import * as remote from '$lib/remotes/struct.remote';

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
		data: PartialStructable<
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
		return attemptAsync(async () => {
			if (!this.data.vhId) throw new Error('No vhId available to delete version');
			await remote.removeVersion({
				struct: this.struct.data.name,
				vhId: String(this.data.vhId)
			});
		});
	}

	/**
	 * Restore the version
	 *
	 * @returns {*}
	 */
	restore() {
		return attemptAsync(async () => {
			if (!this.data.vhId) throw new Error('No vhId available to restore version');
			await remote.restoreVersion({
				struct: this.struct.data.name,
				vhId: String(this.data.vhId)
			});
		});
	}
}
