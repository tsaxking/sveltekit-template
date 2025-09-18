import { attemptAsync } from 'ts-utils/check';
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

export const copyCanvas = (canvas: HTMLCanvasElement, notify: boolean) => {
	return attemptAsync(async () => {
		const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res));
		if (!blob) throw new Error('Failed to convert canvas to blob');

		const item = new ClipboardItem({ 'image/png': blob });
		await navigator.clipboard.write([item]);

		if (notify) {
			notif({
				title: 'Copied to clipboard',
				message: 'The image has been copied to your clipboard.',
				color: 'success',
				autoHide: 3000
			});
		}
	});
};

export const copyImage = (img: HTMLImageElement | string, notify: boolean) => {
	return attemptAsync(async () => {
		let imageElement: HTMLImageElement;
		if (typeof img === 'string') {
			imageElement = new Image();
			imageElement.crossOrigin = 'anonymous';
			imageElement.src = img;
			await new Promise((res, rej) => {
				imageElement.onload = res;
				imageElement.onerror = rej;
			});
			img = imageElement;
		} else {
			imageElement = img;
		}
		const response = await fetch(imageElement.src);
		const blob = await response.blob();
		if (!blob) throw new Error('Failed to fetch image blob');

		const item = new ClipboardItem({ [blob.type]: blob });
		await navigator.clipboard.write([item]);

		if (notify) {
			notif({
				title: 'Copied to clipboard',
				message: 'The image has been copied to your clipboard.',
				color: 'success',
				autoHide: 3000
			});
		}
	});
};
