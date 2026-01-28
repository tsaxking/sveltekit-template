/**
 * @fileoverview Notification payload type.
 *
 * @example
 * import type { Notification } from '$lib/types/notification';
 * const notif: Notification = {
 *   title: 'Saved',
 *   message: 'Changes were saved',
 *   severity: 'success'
 * };
 */
import { type Icon } from './icons';

/**
 * Notification message payload.
 *
 * @property {string} title - Title text.
 * @property {string} message - Body message.
 * @property {Icon} [icon] - Optional icon.
 * @property {'info'|'warning'|'danger'|'success'} severity - Severity level.
 */
export type Notification = {
	title: string;
	message: string;
	icon?: Icon;
	severity: 'info' | 'warning' | 'danger' | 'success';
};
