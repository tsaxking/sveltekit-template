/**
 * @fileoverview Navbar section registry and helpers.
 *
 * @example
 * import { Navbar } from '$lib/model/navbar';
 * Navbar.addSection({
 *   name: 'Admin',
 *   priority: 0,
 *   links: [{ name: 'Logs', href: '/dashboard/admin/logs', icon: { type: 'material-icons', name: 'list' } }]
 * });
 */
import type { Icon } from '$lib/types/icons';
import { WritableArray } from '$lib/services/writables';

/**
 * Navbar section registry.
 *
 * Provides a writable registry to manage navigation sections and links.
 */
export namespace Navbar {
	/**
	 * Navbar section definition.
	 *
	 * @property {string} name - Section label.
	 * @property {number} priority - Sort order (lower renders first).
	 * @property {{ icon: Icon; name: string; href: string; external?: boolean; disabled?: boolean }[]} links - Links shown in the section.
	 */
	type Section = {
		name: string;
		priority: number;
		links: {
			icon: Icon;
			// type: 'material-icons' | 'font-awesome' | 'material-symbols' | 'bootstrap' | 'custom';
			name: string;
			href: string;
			external?: boolean;
			disabled?: boolean;
		}[];
	};

	/**
	 * Internal sections store.
	 */
	class Sections extends WritableArray<Section> {
		public constructor() {
			super([]);
		}
	}

	/**
	 * Internal singleton store of sections.
	 */
	const sections = new Sections();

	/**
	 * Adds or replaces a section and maintains sort order.
	 *
	 * @param {Section} section - Section definition.
	 * @returns {void}
	 *
	 * @example
	 * Navbar.addSection({
	 *   name: 'Admin',
	 *   priority: 0,
	 *   links: [{ name: 'Logs', href: '/dashboard/admin/logs', icon: { type: 'material-icons', name: 'list' } }]
	 * });
	 */
	export const addSection = (section: Section) => {
		sections.update((s) => {
			const has = s.some((s) => s.name === section.name);
			if (!has) s.push(section);
			else {
				console.warn(`Navbar: Section ${section.name} already exists, overriding...`);
				const index = s.findIndex((s) => s.name === section.name);
				s[index] = section;
			}
			s.sort((a, b) => a.priority - b.priority);
			return s;
		});
	};

	/**
	 * Returns the writable list of sections.
	 *
	 * @returns {WritableArray<Section>} Writable sections store.
	 */
	export const getSections = () => sections;

	/**
	 * Removes a section by name.
	 *
	 * @param {Section} section - Section to remove.
	 * @returns {void}
	 */
	export const removeSection = (section: Section) => {
		sections.update((s) => {
			const index = s.findIndex((s) => s.name === section.name);
			if (index !== -1) s.splice(index, 1);
			return s;
		});
	};

	/**
	 * Clears all sections.
	 *
	 * @returns {void}
	 */
	export const clear = () => sections.clear();
}
