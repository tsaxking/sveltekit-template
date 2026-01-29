/**
 * @fileoverview Helpers for generating TypeScript and Zod types from data.
 *
 * @example
 * import { toType, toZodType } from '$lib/utils/generate-type';
 * const t = toType({ name: 'Jane', age: 1 });
 * const zt = toZodType({ name: 'Jane', age: 1 });
 */
/**
 * Generates a TypeScript type string from a value.
 *
 * @param {unknown} data - Value to infer.
 */
export const toType = (data: unknown): string => {
	if (typeof data === 'object') {
		if (Array.isArray(data)) {
			const types = data.map(toType);
			const uniqueTypes = [...new Set(types)]; // Ensure no duplicates
			if (uniqueTypes.length === 1) {
				return `${uniqueTypes[0]}[]`; // Single type array
			}
			return `${uniqueTypes.join(' | ')}[]`; // Multiple types array
		}
		if (data === null) {
			return 'null';
		}
		return `{${Object.entries(data)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([key, value]) => `${key}: ${toType(value)}`)
			.join(', ')}}`;
	}
	return typeof data;
};

/**
 * Generates a Zod schema string from a value.
 *
 * @param {unknown} data - Value to infer.
 */
export const toZodType = (data: unknown): string => {
	if (typeof data === 'object') {
		if (Array.isArray(data)) {
			const types = data.map(toZodType);
			const uniqueTypes = [...new Set(types)]; // Ensure no duplicates
			if (uniqueTypes.length === 0) {
				return 'z.array(z.unknown())'; // Empty
			}
			if (uniqueTypes.length === 1) {
				return `z.array(${uniqueTypes[0]})`; // Single type array
			}
			return `z.union([${uniqueTypes.join(', ')}])`; // Multiple types array
		}
		if (data === null) {
			return 'z.null()';
		}
		return `z.object({${Object.entries(data)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([key, value]) => `${key}: ${toZodType(value)}`)
			.join(', ')}})`;
	}
	return `z.${typeof data}()`;
};
