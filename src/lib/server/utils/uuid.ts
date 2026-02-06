/**
 * @fileoverview UUID v4 generator utility.
 *
 * @example
 * import { uuid } from '$lib/server/utils/uuid';
 * const id = uuid();
 */
import { v4 } from 'uuid';

/**
 * Returns a UUID v4 string.
 */
export const uuid = (): string => v4();
