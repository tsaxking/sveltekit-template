import { describe, expect, test, vi, afterEach } from 'vitest';

describe('downloads utilities', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	test('downloadUrl creates anchor and clicks', async () => {
		const click = vi.fn();
		const appendSpy = vi.spyOn(document.body, 'appendChild');
		const removeSpy = vi.spyOn(document.body, 'removeChild');

		const createSpy = vi.spyOn(document, 'createElement').mockImplementation((tag) => {
			const el = document.createElementNS('http://www.w3.org/1999/xhtml', tag) as HTMLElement & {
				click?: () => void;
			};
			if (tag === 'a') {
				(el as HTMLAnchorElement).click = click;
			}
			return el;
		});

		const { downloadUrl } = await import('$lib/utils/downloads');
		await downloadUrl('https://example.com/file.txt', 'file.txt');

		expect(click).toHaveBeenCalled();
		expect(appendSpy).toHaveBeenCalled();
		expect(removeSpy).toHaveBeenCalled();
		createSpy.mockRestore();
	});

	test('downloadText returns attempt ok', async () => {
		if (!URL.createObjectURL) {
			Object.defineProperty(URL, 'createObjectURL', {
				value: () => 'blob:mock',
				configurable: true
			});
		}
		const urlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
		const { downloadText } = await import('$lib/utils/downloads');
		const res = await downloadText('hello', 'hello.txt');
		expect(res.isOk()).toBe(true);
		urlSpy.mockRestore();
	});

	test('loadFiles resolves selected files', async () => {
		const file = {
			name: 'hello.txt',
			text: async () => 'hello'
		} as unknown as File;
		const input = document.createElement('input');
		const fileList = {
			0: file,
			length: 1,
			item: (index: number) => (index === 0 ? file : null),
			[Symbol.iterator]: function* () {
				yield file;
			}
		} as unknown as FileList;
		Object.defineProperty(input, 'files', {
			value: fileList,
			configurable: true
		});

		const createSpy = vi.spyOn(document, 'createElement').mockImplementation(() => input);

		const { loadFiles } = await import('$lib/utils/downloads');
		const promise = loadFiles(false).unwrap();
		input.onchange?.(new Event('change'));
		const files = await promise;
		expect(files[0]?.name).toBe('hello.txt');

		createSpy.mockRestore();
	});

	test('loadFileContents returns file text', async () => {
		const file = {
			name: 'hello.txt',
			text: async () => 'hello'
		} as unknown as File;
		const input = document.createElement('input');
		const fileList = {
			0: file,
			length: 1,
			item: (index: number) => (index === 0 ? file : null),
			[Symbol.iterator]: function* () {
				yield file;
			}
		} as unknown as FileList;
		Object.defineProperty(input, 'files', {
			value: fileList,
			configurable: true
		});

		const createSpy = vi.spyOn(document, 'createElement').mockImplementation(() => input);

		const { loadFileContents } = await import('$lib/utils/downloads');
		const promise = loadFileContents(false).unwrap();
		input.onchange?.(new Event('change'));
		const contents = await promise;
		expect(contents[0]?.text).toBe('hello');

		createSpy.mockRestore();
	});
});
