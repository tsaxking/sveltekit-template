/**
 * @fileoverview Struct data staging and conflict resolution.
 *
 * Provides local staging of struct data with merge/conflict helpers.
 *
 * @example
 * import { StructDataStage } from '$lib/services/struct/data-staging';
 * const stage = new StructDataStage(data);
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { attempt, attemptAsync } from 'ts-utils/check';
import { type Blank, type PartialStructable, type GlobalCols } from './index';
import { writable, get } from 'svelte/store';
import { StructData } from './struct-data';
import { WritableBase } from '$lib/services/writables';

/**
 * Used in data proxies - a conflict is when both the local and remote data differ from the base data and from each other.
 *
 * @typedef {Conflict}
 * @template {Blank} T
 * @template {keyof T} K
 */
type Conflict<T extends Blank, K extends keyof T> = {
	property: K;
	baseValue: PartialStructable<T>[K];
	localValue: PartialStructable<T>[K];
	remoteValue: PartialStructable<T>[K];
};

/**
 * Conflict resolution function
 *
 * @typedef {FullConflictResolver}
 * @template {Blank} T
 */
type FullConflictResolver<T extends Blank> = (args: {
	base: PartialStructable<T & GlobalCols>;
	local: PartialStructable<T & GlobalCols>;
	remote: PartialStructable<T & GlobalCols>;
	conflicts: Conflict<T, keyof T>[];
}) => PartialStructable<T> | Promise<PartialStructable<T>>;

/**
 * Save strategy for struct data, this is used to determine how to handle conflicts when saving data.
 *
 * @typedef {SaveStrategy}
 * @template {Blank} T
 */
type SaveStrategy<T extends Blank> = {
	strategy:
		| 'ifClean'
		| 'force'
		| 'preferLocal'
		| 'preferRemote'
		| 'mergeClean'
		| 'manual'
		| FullConflictResolver<T>;
	createIfDeleted: boolean;
};

/**
 * Status of a merge operation, this is used to determine the state of the local and remote data in relation to the base data.
 *
 * @typedef {MergeStatus}
 */
type MergeStatus =
	| 'clean' // local == remote == base, no changes
	| 'localDiverge' // local differs from base, remote == base
	| 'remoteDiverge' // remote differs from base, local == base
	| 'diverged' // local and remote both differ from base, but local == remote (no conflict)
	| 'conflicted'; // local and remote both differ from base and differ from each other (conflict)

/**
 * State of a merge operation, this is used to track the status and conflicts during a merge.
 *
 * @interface MergeState
 * @typedef {MergeState}
 * @template {Blank} T
 * @template {keyof T} K
 */
interface MergeState<T extends Blank, _K extends keyof T> {
	/**
	 * Status of the merge operation, indicating the relationship between local, remote, and base data.
	 *
	 * @type {MergeStatus}
	 */
	status: MergeStatus;
	/**
	 * Any local changes that have been made to the data that have not yet been saved and conflict with remote data.
	 *
	 * @type {Conflict<T, keyof T>[]}
	 */
	conflicts: Conflict<T, keyof T>[];
}

/**
 * Global columns that are always present in every struct data.
 */
type StructDataStageConfig<T extends Blank> = {
	/**
	 * Prevents the Staging from modifying these properties.
	 */
	static?: (keyof T)[];
};

/**
 * A Staging wrapper for StructData that allows local changes to be staged
 * before being saved to the backend. It tracks both local and remote changes.
 *
 * Local changes are made through `data`, and changes will not be pushed
 * to the backend until `.save()` is called.
 *
 * Remote updates from the backend trigger a flag (`remoteUpdated`) but do
 * not modify the local data until `.pull()` is called.
 *
 * @template T The shape of the base struct (excluding global columns).
 */
export class StructDataStage<T extends Blank> extends WritableBase<
	PartialStructable<T & GlobalCols>
> {
	/**
	 * The base data structure, which is a snapshot of the remote data
	 *
	 * @public
	 * @type {PartialStructable<T & GlobalCols>}
	 */
	public base: PartialStructable<T & GlobalCols>;

	/** Tracks whether the backend (remote) data has changed since the last pull. */
	public readonly remoteUpdated = writable(false);

	/** Tracks whether the local data has been modified since the last save or pull. */
	public readonly localUpdated = writable(false);

	public readonly deleted = writable(false);

	/**
	 * @param structData The live backend-backed StructData instance to Staging.
	 */
	constructor(
		public readonly structData: StructData<(T & GlobalCols) | T>,
		public readonly config: StructDataStageConfig<T> = {}
	) {
		super(structData.data);
		this.data = this.makeStaging(structData.data);
		const dataUnsub = this.structData.subscribe(() => {
			this.remoteUpdated.set(true);
		});
		this.onAllUnsubscribe(() => {
			dataUnsub();
		});
		this.base = JSON.parse(JSON.stringify(this.data)) as PartialStructable<T & GlobalCols>;
		this.structData.struct.on('delete', (d) => {
			if (d.data.id === structData.data.id) {
				this.deleted.set(true);
			}
		});
	}

	/**
	 * Creates a reactive Staging for the provided data object.
	 * Any mutation will trigger subscribers and mark the local state as dirty.
	 */
	private makeStaging(data: PartialStructable<T & GlobalCols>) {
		return new Proxy(JSON.parse(JSON.stringify(data)) as PartialStructable<T & GlobalCols>, {
			set: (target, property, value) => {
				if (this.config.static?.includes(property as keyof T)) {
					throw new Error(`Cannot modify static property "${String(property)}" in StructDataStage`);
				}
				if (target[property as keyof typeof target] !== value) {
					target[property as keyof typeof target] = value;
					this.inform();
				}
				this.setLocalChanged();
				return true;
			},
			deleteProperty: (target, property) => {
				throw new Error(`Cannot delete property "${String(property)}" from StructDataStage`);
			}
		});
	}

	/**
	 * Sets the local change flag based on whether the current data
	 *
	 * @private
	 */
	private setLocalChanged() {
		if (Object.keys(this.data).every((k) => this.data[k] === this.base[k])) {
			this.localUpdated.set(false);
		} else {
			this.localUpdated.set(true);
		}
	}

	/**
	 * Replaces the current local data with a new object.
	 * Triggers change tracking and subscribers.
	 *
	 * @param data The new data to replace with.
	 * @returns The newly proxied data object.
	 */
	public set(data: PartialStructable<T & GlobalCols>) {
		this.data = this.makeStaging(data);
		this.inform();
		this.localUpdated.set(true);
		return this.data;
	}

	/**
	 * Applies a transformation function to the local data.
	 * Triggers change tracking and subscribers.
	 *
	 * @param fn A function that receives and returns the new data shape.
	 * @returns The newly proxied data object.
	 */
	public update(
		fn: (data: PartialStructable<T & GlobalCols>) => PartialStructable<T & GlobalCols>
	) {
		this.data = this.makeStaging(fn(this.data));
		this.inform();
		this.localUpdated.set(true);
		return this.data;
	}
	/**
	 * Resets the local state to match the backend data,
	 * clearing both local and remote change flags.
	 */
	public pull() {
		this.remoteUpdated.set(false);
		this.localUpdated.set(false);
		this.data = this.makeStaging(this.structData.data);
		this.base = JSON.parse(JSON.stringify(this.data)) as PartialStructable<T & GlobalCols>;
		this.inform();
	}

	/**
	 * Reverts local changes, resetting data to the base snapshot.
	 * This is a **local-only** operation; it does not affect the backend or pull the current remote state.
	 *
	 * - If specific properties are provided, only those will be reset.
	 * - If no properties are given, the entire object is reset to the base snapshot.
	 *
	 * @param properties - List of property keys to selectively rollback. If empty, resets all properties.
	 * @throws {Error} If a static property is attempted to be modified.
	 * @throws {Error} If a given property does not exist in the base snapshot.
	 */
	public rollback(...properties: (keyof T)[]) {
		return attempt(() => {
			if (properties.length > 0) {
				let hasChanges = false;

				for (const p of properties) {
					if (this.config.static?.includes(p)) {
						throw new Error(`Cannot modify static property "${String(p)}" in StructDataStage`);
					}
					if (p in this.base) {
						const baseValue = this.base[p];
						if (this.data[p] !== baseValue) {
							(this.data as any)[p] = baseValue;
							hasChanges = true;
						}
					} else {
						throw new Error(`Property "${String(p)}" does not exist in base data`);
					}
				}

				if (hasChanges) {
					this.inform();
				}
				this.setLocalChanged();

				return;
			}

			// Full rollback
			this.data = this.makeStaging(this.base);
			this.inform();
			this.localUpdated.set(false);
		});
	}

	/**
	 * Returns whether the local or remote data has diverged
	 * from the current proxied state.
	 *
	 * @returns `true` if either `localUpdated` or `remoteUpdated` is `true`.
	 */
	public isDirty(): boolean {
		return get(this.localUpdated) || get(this.remoteUpdated);
	}

	/**
	 * Returns whether the backend (remote) has changed since the last `pull()`.
	 */
	public remoteChanged(): boolean {
		return get(this.remoteUpdated);
	}

	/**
	 * Returns whether the local data has been changed since the last `save()` or `pull()`.
	 */
	public localChanged(): boolean {
		return get(this.localUpdated);
	}

	/**
	 * Attempts to save local changes to the underlying struct data, resolving any conflicts
	 * using the specified strategy.
	 *
	 * A conflict is defined as a property where:
	 *   - both the local and remote values differ from the base, and
	 *   - the local and remote values are not equal.
	 *
	 * @param config
	 * @param config.strategy - Determines how to handle differences and conflicts:
	 * @param config.createIfDeleted -
	 *
	 *  - `"ifClean"`:
	 *      - Only saves if remote is identical to base.
	 *      - Throws if any remote change is detected.
	 *
	 *  - `"force"`:
	 *      - Ignores conflicts and always overwrites remote with local values.
	 *
	 *  - `"preferLocal"`:
	 *      - In conflicts, prefers local value.
	 *      - In non-conflicts, prefers whichever value (local or remote) has changed from base.
	 *
	 *  - `"preferRemote"`:
	 *      - In conflicts, prefers remote value.
	 *      - In non-conflicts, prefers whichever value (local or remote) has changed from base.
	 *
	 *  - `"mergeClean"`:
	 *      - Throws if any conflicts exist.
	 *      - Otherwise, merges values that differ from base (either local or remote).
	 *
	 *
	 *  - `function(conflict): value`:
	 *      - A custom resolver function called for each conflict.
	 *      - Should return the resolved value for each property.
	 *
	 * After a successful save, the base snapshot is updated and all dirty flags are cleared.
	 */
	public async save(config: SaveStrategy<T>) {
		return attemptAsync(async () => {
			if (get(this.deleted)) {
				if (config.createIfDeleted) {
					// as any because the server will give us an error if any property is missing
					await this.structData.struct.new(this.data as any).unwrap();
				} else {
					throw new Error('Data is deleted, unable to update');
				}
			}
			const local = this.data;
			const remote = this.structData.data;
			const base = this.base;

			const keys = new Set([
				...Object.keys(local),
				...Object.keys(remote),
				...Object.keys(base)
			]) as Set<keyof T>;

			const conflicts: {
				property: keyof T;
				baseValue: PartialStructable<T>[keyof T];
				localValue: PartialStructable<T>[keyof T];
				remoteValue: PartialStructable<T>[keyof T];
			}[] = [];

			const merged: PartialStructable<T> = {};

			for (const key of keys) {
				const baseValue = base[key];
				const localValue = local[key];
				const remoteValue = remote[key];

				const localChanged = localValue !== baseValue;
				const remoteChanged = remoteValue !== baseValue;
				const isConflict = localChanged && remoteChanged && localValue !== remoteValue;

				if (isConflict) {
					conflicts.push({
						property: key,
						baseValue: baseValue as PartialStructable<T>[keyof T],
						localValue: localValue as PartialStructable<T>[keyof T],
						remoteValue: remoteValue as PartialStructable<T>[keyof T]
					});
				}

				if (typeof config.strategy === 'string') {
					switch (config.strategy) {
						case 'ifClean':
							if (remoteChanged) throw new Error('Remote has diverged from base');
							if (localChanged) merged[key] = localValue;
							break;

						case 'force':
							merged[key] = localValue;
							break;

						case 'preferLocal':
							(merged as any)[key] = isConflict || localChanged ? localValue : remoteValue;
							break;

						case 'preferRemote':
							(merged as any)[key] = isConflict || remoteChanged ? remoteValue : localValue;
							break;

						case 'mergeClean':
							if (isConflict) throw new Error('Conflicts prevent mergeClean');
							if (localChanged) merged[key] = localValue;
							else if (remoteChanged) (merged as any)[key] = remoteValue;
							break;

						case 'manual':
							if (conflicts.length > 0) {
								throw {
									message: 'Manual merge required',
									base,
									local,
									remote,
									conflicts
								};
							}
							if (localChanged) merged[key] = localValue;
							break;

						default:
							throw new Error(`Unknown strategy: ${config.strategy satisfies never}`);
					}
				}
			}

			if (typeof config.strategy === 'function') {
				const resolved = await config.strategy({
					base,
					local,
					remote,
					conflicts
				});

				Object.assign(merged, resolved);
			}

			if (Object.keys(merged).length > 0) {
				await this.structData.update((d) => ({ ...d, ...merged }));
				this.localUpdated.set(false);
				this.remoteUpdated.set(false);
				this.base = structuredClone(this.data);
				this.inform();
			}
		});
	}

	/**
	 *
	 * @returns {MergeState<T>} The current merge state, including status and any conflicts.
	 */
	public getMergeState(): MergeState<T, keyof T> {
		const local = this.data;
		const remote = this.structData.data;
		const base = this.base;

		const conflicts: MergeState<T, keyof T>['conflicts'] = [];
		let hasLocalDiverge = false;
		let hasRemoteDiverge = false;
		let hasConflict = false;

		const keys = new Set([
			...Object.keys(local),
			...Object.keys(remote),
			...Object.keys(base)
		]) as Set<keyof T>;

		for (const key of keys) {
			const localValue = local[key];
			const remoteValue = remote[key];
			const baseValue = base[key];

			if (localValue === undefined || remoteValue === undefined || baseValue === undefined)
				continue;

			const localChanged = localValue !== baseValue;
			const remoteChanged = remoteValue !== baseValue;

			if (localChanged) hasLocalDiverge = true;
			if (remoteChanged) hasRemoteDiverge = true;

			if (localChanged && remoteChanged && localValue !== remoteValue) {
				hasConflict = true;
				conflicts.push({
					property: key,
					localValue: localValue as PartialStructable<T>[keyof T],
					remoteValue: remoteValue as PartialStructable<T>[keyof T],
					baseValue: baseValue as PartialStructable<T>[keyof T]
				});
			}
		}

		let status: MergeStatus;

		if (!hasLocalDiverge && !hasRemoteDiverge) status = 'clean';
		else if (hasConflict) status = 'conflicted';
		else if (hasLocalDiverge && hasRemoteDiverge) status = 'diverged';
		else if (hasLocalDiverge) status = 'localDiverge';
		else /* hasRemoteDiverge */ status = 'remoteDiverge';

		return { status, conflicts };
	}
}
