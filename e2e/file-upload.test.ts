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

// Admin credentials for test
const ADMIN_USERNAME = 'testadmin';
const ADMIN_PASSWORD = 'AdminPassword123!';
const ADMIN_EMAIL = 'testadmin@example.com';

// Test files configuration
const TEST_FILES = [
	{
		name: 'test-image.png',
		// 1x1 pixel transparent PNG for testing image upload
		content: Buffer.from(
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
			'base64'
		),
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

let adminAccount: ReturnType<typeof Account.Account.Generator> | undefined;

/**
 * Clean up uploaded test files from the upload directory
 */
async function cleanupTestFiles() {
	try {
		const files = await fs.readdir(UPLOAD_DIR);
		for (const file of files) {
			// Clean up files that contain our test file names
			const isTestFile = TEST_FILES.some((tf) => file.includes(tf.name));
			if (isTestFile) {
				await fs.unlink(path.join(UPLOAD_DIR, file));
			}
		}
	} catch (err) {
		// Ignore errors if directory doesn't exist
		console.log('Error cleaning up test files:', err);
	}
}

beforeAll(async () => {
	await Struct.buildAll(DB).unwrap();
	process.env.AUTO_SIGN_IN = undefined; // disable auto sign in for this test

	// Create admin account for file upload
	adminAccount = await Account.createAccount({
		username: ADMIN_USERNAME,
		email: ADMIN_EMAIL,
		firstName: 'Test',
		lastName: 'Admin',
		password: ADMIN_PASSWORD
	}).unwrap();

	// Add to admins table
	await Account.Admins.new({
		accountId: adminAccount.id
	}).unwrap();

	// Ensure upload directory exists
	await fs.mkdir(UPLOAD_DIR, { recursive: true });
});

afterAll(async () => {
	// Clean up admin account (admin record is auto-deleted via delete hook)
	if (adminAccount) {
		await adminAccount.delete().unwrap();
	}

	// Clean up uploaded test files
	await cleanupTestFiles();
});

describe('File Upload E2E Test', () => {
	test('Upload multiple files of different types', async ({ page }) => {
		logging(page);

		if (!adminAccount) {
			throw new Error('Admin account not created');
		}

		// Sign in as admin
		await signIn(page, ADMIN_USERNAME, ADMIN_PASSWORD);

		// Navigate to file upload test page
		await page.goto('/test/file-upload');

		// Wait for the page to load
		await page.waitForLoadState('networkidle');

		// Create temporary files for upload
		const tmpDir = path.join(process.cwd(), 'tmp', 'test-uploads');
		await fs.mkdir(tmpDir, { recursive: true });

		const filePaths: string[] = [];
		for (const testFile of TEST_FILES) {
			const filePath = path.join(tmpDir, testFile.name);
			await fs.writeFile(filePath, testFile.content);
			filePaths.push(filePath);
		}

		// Click the upload button to open modal
		const uploadButton = page.locator('button').filter({ hasText: 'Drag and drop your files' });
		await uploadButton.click();

		// Wait for modal to appear
		await page.waitForSelector('.uppy-Dashboard', { timeout: 5000 });

		// Find the file input element within the Uppy dashboard
		const fileInput = page.locator('.uppy-Dashboard-input').first();
		await fileInput.setInputFiles(filePaths);

		// Wait for files to be added to the upload list
		await page.waitForSelector('.uppy-Dashboard-Item', { timeout: 10000 });

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
		for (const testFile of TEST_FILES) {
			const matchingFile = uploadedFiles.find((f) => f.includes(testFile.name));
			expect(matchingFile).toBeTruthy();

			if (matchingFile) {
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
		await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});

		// Clean up uploaded files
		await cleanupTestFiles();
	});
});
