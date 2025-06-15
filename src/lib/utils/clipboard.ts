import { notify as notif } from './prompts';

export const copy = (text: string, notify: boolean) => {
	navigator.clipboard.writeText(text);
	if (notify) {
		notif({
			title: 'Copied to clipboard',
			message: 'The text has been copied to your clipboard.',
			color: 'success',
			autoHide: 3000
		});
	}
};
