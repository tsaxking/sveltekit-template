import type { Icon } from '$lib/types/icons';
import { WritableArray } from '$lib/writables';

export namespace Navbar {
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

	class Sections extends WritableArray<Section> {
		public constructor() {
			super([]);
		}
	}

	const sections = new Sections();

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

	export const getSections = () => sections;

	export const removeSection = (section: Section) => {
		sections.update((s) => {
			const index = s.findIndex((s) => s.name === section.name);
			if (index !== -1) s.splice(index, 1);
			return s;
		});
	};

	export const clear = () => sections.clear();
}
