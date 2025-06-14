import { type Writable } from 'svelte/store';

export namespace Navbar {
	type Section = {
		name: string;
		priority: number;
		links: {
			icon: string;
			type: 'material-icons' | 'font-awesome' | 'material-symbols' | 'bootstrap' | 'custom';
			name: string;
			href: string;
		}[];
	};

	class Sections implements Writable<Section[]> {
		public readonly data: Section[] = [];

		public constructor() {}

		private readonly subscribers = new Set<(value: Section[]) => void>();
		public inform() {
			this.subscribers.forEach((fn) => fn(this.data));
		}

		public subscribe(fn: (value: Section[]) => void) {
			this.subscribers.add(fn);
			fn(this.data);
			return () => this.subscribers.delete(fn);
		}

		public set(value: Section[]) {
			this.data.splice(0, this.data.length, ...value);
			this.inform();
		}

		public update(fn: (value: Section[]) => Section[]) {
			this.set(fn(this.data));
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
}
