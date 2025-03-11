import { writable, type Writable } from "svelte/store";

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

    const sections: Writable<Section[]> = writable([]);

    export const addSection = (section: Section) => {
        sections.update(s => {
            const has = s.some(s => s.name === section.name);
            if (!has) s.push(section);
            else {
                console.warn(`Navbar: Section ${section.name} already exists, overriding...`);
                const index = s.findIndex(s => s.name === section.name);
                s[index] = section;
            }
            s.sort((a, b) => a.priority - b.priority);
            return s;
        });
    }

    export const getSections = () => sections;
}