import fs from 'fs/promises';
import path from 'path';
import { Account } from '$lib/server/structs/account';
import { ServerCode } from 'ts-utils/status';
import { fail } from '@sveltejs/kit';
import { EventEmitter } from 'ts-utils/event-emitter';

// xhr only for now
export class FileUploader extends EventEmitter<{
	load: string;
	error: string;
}> {
	uploadDir: string;

	constructor(uploadDir: string) {
		super();
		this.uploadDir = uploadDir;
	}

	/**
	 * File Upload Receiver
	 *
	 * This natively works with Uppy via a FileUploader component.
	 *
	 * @param {File} file - The file to upload.
	 * @param {Account.AccountData} account - The account initiating the upload.
	 * @returns {Promise<{ url: string }>} An object containing the uploaded file URL.
	 */
	async receiveFile(file: File, account: Account.AccountData): Promise<{ url: string }> {
		if (!file) {
			this.emit('error', 'No file provided');
			throw new Error('No file provided');
		}

		if (!account) {
			this.emit('error', 'Unauthorized');
			throw fail(ServerCode.unauthorized);
		}

		if (!(await Account.isAdmin(account))) {
			// this.emit('error', 'You do not have permission to upload files.');
			throw fail(ServerCode.forbidden, {
				message: 'You do not have permission to upload files.'
			});
		}

		await fs.mkdir(this.uploadDir, { recursive: true });

		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		const fileId = `${Date.now()}-${file.name}`;
		const filePath = path.join(this.uploadDir, fileId);

		await fs.writeFile(filePath, buffer);
		// console.log(`Saved file to ${filePath}`);

		this.emit('load', fileId);
		return { url: fileId };
	}

	/**
	 * File Uploader
	 *
	 * This is a stopgap until we have a separate microservice for file uploads.
	 * Raw XHR requests, no Tus or anything.
	 *
	 * @param {File} file - The file to upload.
	 * @param {Account.AccountData} account - The account initiating the upload.
	 * @returns {Promise<{ url: string }>} An object containing the uploaded file URL.
	 */
	async uploadFile(file: File, endpoint: string): Promise<{ url: string }> {
		const formData = new FormData();
		formData.append('file', file);

		const response = await fetch(endpoint, {
			method: 'POST',
			body: formData
		});

		if (!response.ok) {
			const message = await response.text();
			this.emit('error', message || 'Failed to upload file');
			throw new Error(message || 'Failed to upload file');
		}

		const result = (await response.json()) as { url: string };
		this.emit('load', result.url);
		return result;
	}
}
