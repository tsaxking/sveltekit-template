/**
 * @fileoverview Struct action enums for permission checks.
 *
 * @example
 * import { DataAction, PropertyAction } from '$lib/types/struct';
 */
/**
 * Property-level actions.
 */
export enum PropertyAction {
	Read = 'read',
	Update = 'update',
	ReadArchive = 'read-archive',
	ReadVersionHistory = 'read-version-history',
	SetAttributes = 'set-attributes' // ADMIN ONLY
}

// these are not property specific
/**
 * Data-level actions.
 */
export enum DataAction {
	Create = 'create',
	Delete = 'delete',
	Archive = 'archive',
	RestoreArchive = 'restore-archive',
	RestoreVersion = 'restore-version',
	DeleteVersion = 'delete-version',
	// ReadVersionHistory = 'read-version-history',
	// ReadArchive = 'read-archive'
	Clear = 'clear' // ADMIN ONLY
}
