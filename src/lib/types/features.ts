import { type Icon } from './icons';

export type Feature = {
	id: string;
	name: string;
	description: string;
	date: number;
	icon: Icon;
	picture?: string;
};
