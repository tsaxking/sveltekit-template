import { Icon } from './icon';

export type Notification = {
	title: string;
	message: string;
	icon?: Icon;
	severity: 'info' | 'warning' | 'danger' | 'success';
};
