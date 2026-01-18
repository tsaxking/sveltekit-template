import * as testing from '@playwright/test';
import { Account } from '../src/lib/server/structs/account';
import { Struct } from 'drizzle-struct/back-end';
import { DB } from '../src/lib/server/db';
import { signIn, logging } from './test-utils';
import fs from 'fs/promises';
import path from 'path';

const expect = testing.expect;
const test = testing.test;
const describe = testing.default.describe;
const afterAll = testing.default.afterAll;
const beforeAll = testing.default.beforeAll;

const UPLOAD_DIR = path.resolve(process.cwd(), './static/uploads');

let adminAccount: Account.AccountData | undefined;

beforeAll(async () => {
	await Struct.buildAll(DB).unwrap();
	process.env.AUTO_SIGN_IN = undefined; // disable auto sign in for this test

	// Create admin account for file upload
	adminAccount = await Account.createAccount({
		username: 'testadmin',
		email: 'testadmin@example.com',
		firstName: 'Test',
		lastName: 'Admin',
		password: 'AdminPassword123!'
	}).unwrap();

	// Add to admins table
	await Account.Admins.new({
		accountId: adminAccount.id
	}).unwrap();

	// Ensure upload directory exists
	await fs.mkdir(UPLOAD_DIR, { recursive: true });
});

afterAll(async () => {
	// Clean up admin account
	if (adminAccount) {
		const admin = await Account.Admins.fromProperty('accountId', adminAccount.id, {
			type: 'single'
		}).unwrap();
		if (admin) {
			await admin.delete().unwrap();
		}
		await adminAccount.delete().unwrap();
	}

	// Clean up uploaded test files
	try {
		const files = await fs.readdir(UPLOAD_DIR);
		for (const file of files) {
			// Clean up files that contain our test file names
			if (file.includes('test-image.png') || 
			    file.includes('test-text.txt') || 
			    file.includes('test-json.json')) {
				await fs.unlink(path.join(UPLOAD_DIR, file));
			}
		}
	} catch (err) {
		// Ignore errors if directory doesn't exist
		console.log('Error cleaning up test files:', err);
	}
});

describe('File Upload E2E Test', () => {
	test('Upload multiple files of different types', async ({ page }) => {
		logging(page);

		if (!adminAccount) {
			throw new Error('Admin account not created');
		}

		// Sign in as admin
		await signIn(page, 'testadmin', 'AdminPassword123!');

		// Navigate to file upload test page
		await page.goto('/test/file-upload');

		// Wait for the page to load
		await page.waitForLoadState('networkidle');

		// Create test files to upload
		const testFiles = [
			{
				name: 'test-image.png',
				content: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'),
				type: 'image/png'
			},
			{
				name: 'test-text.txt',
				content: Buffer.from('This is a test text file for e2e testing.'),
				type: 'text/plain'
			},
			{
				name: 'test-json.json',
				content: Buffer.from(JSON.stringify({ test: 'data', value: 123 })),
				type: 'application/json'
			}
		];

		// Create temporary files for upload
		const tmpDir = path.join(process.cwd(), 'tmp', 'test-uploads');
		await fs.mkdir(tmpDir, { recursive: true });

		const filePaths: string[] = [];
		for (const testFile of testFiles) {
			const filePath = path.join(tmpDir, testFile.name);
			await fs.writeFile(filePath, testFile.content);
			filePaths.push(filePath);
		}

		// Click the upload button to open modal
		const uploadButton = page.locator('button:has-text("Drag and drop your files")');
		await uploadButton.click();

		// Wait for modal to appear
		await page.waitForSelector('.uppy-Dashboard', { timeout: 5000 });

		// Upload files using Playwright's file chooser
		const fileChooserPromise = page.waitForEvent('filechooser');
		
		// Find and click the "Browse files" button in the Uppy dashboard
		const browseButton = page.locator('.uppy-Dashboard-browse');
		await browseButton.click();
		
		const fileChooser = await fileChooserPromise;
		await fileChooser.setFiles(filePaths);

		// Wait for files to be added to the upload list
		await page.waitForSelector('.uppy-Dashboard-Item', { timeout: 5000 });

		// Click the upload button in the Uppy dashboard
		const uppyUploadButton = page.locator('.uppy-StatusBar-actionBtn--upload');
		await uppyUploadButton.click();

		// Wait for uploads to complete by checking for success indicators
		// Wait for either success message or upload completion
		try {
			await page.waitForSelector('.uppy-StatusBar.is-complete', { timeout: 10000 });
		} catch {
			// Fallback to timeout if selector doesn't appear
			await page.waitForTimeout(3000);
		}

		// Verify files were saved to disk
		const uploadedFiles = await fs.readdir(UPLOAD_DIR);
		
		// Check that files exist in the upload directory
		const uploadedTestFiles: string[] = [];
		for (const testFile of testFiles) {
			const matchingFile = uploadedFiles.find(f => f.includes(testFile.name));
			expect(matchingFile).toBeTruthy();

			if (matchingFile) {
				uploadedTestFiles.push(matchingFile);
				// Verify file contents
				const savedFilePath = path.join(UPLOAD_DIR, matchingFile);
				const savedContent = await fs.readFile(savedFilePath);
				expect(Buffer.compare(savedContent, testFile.content)).toBe(0);
			}
		}

		// Clean up temporary files
		for (const filePath of filePaths) {
			await fs.unlink(filePath).catch(() => {});
		}
		await fs.rmdir(tmpDir).catch(() => {});

		// Clean up uploaded files
		for (const uploadedFile of uploadedTestFiles) {
			await fs.unlink(path.join(UPLOAD_DIR, uploadedFile)).catch(() => {});
		}
	});
});
