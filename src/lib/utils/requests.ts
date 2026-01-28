/**
 * @fileoverview HTTP request helpers with caching, parsing, and uploads.
 *
 * @example
 * import { Requests } from '$lib/utils/requests';
 * const data = await Requests.get('/api/status', { expectStream: false, parser: z.any() }).unwrap();
 */
import { Loop } from 'ts-utils/loop';
import { attemptAsync, type Result } from 'ts-utils/check';
import { Stream } from 'ts-utils/stream';
import { EventEmitter } from 'ts-utils/event-emitter';
import { z } from 'zod';
import { Struct } from '$lib/services/struct';

export namespace Requests {
	/** Metadata headers applied to all requests. */
	export const metadata: Record<string, string> = {};
	let requests: ServerRequest[] = [];

	/**
	 * Error thrown for failed HTTP requests.
	 */
	class RequestError extends Error {
		constructor(
			public readonly status: number,
			public readonly message: string,
			config: GetConfig | PostConfig
		) {
			super(message + JSON.stringify(config));
			this.name = 'RequestError';
		}
	}

	new Loop(() => {
		requests = requests.filter((r) => {
			return r.time + 1000 * 60 * 5 > Date.now();
		});
	}, 1000 * 60);

	/**
	 * Internal request wrapper that caches in-flight requests.
	 */
	class ServerRequest<T extends 'get' | 'post' = 'get' | 'post'> {
		public readonly time = Date.now();
		public promise?: Promise<Result<unknown>>;
		public response?: Result<unknown>;
		constructor(
			public readonly url: string,
			public readonly method: T,
			public readonly config: T extends 'get' ? GetConfig : PostConfig
		) {}

		send() {
			const sending = requests.find((r) => r.id === this.id);
			if (sending && sending.promise) return sending.promise as Promise<Result<unknown>>;

			this.promise = attemptAsync(async () => {
				const result = await fetch(this.url, {
					method: this.method.toUpperCase(),
					headers: {
						...(this.config?.headers ?? {}),
						...metadata,
						'Content-Type': 'application/json',
						Accept: this.config.expectStream ? 'text/event-stream' : 'application/json'
					},
					body:
						this.method === 'post' ? JSON.stringify((this.config as PostConfig).body) : undefined
				});

				if (!result.ok) {
					throw new RequestError(result.status, `Request failed: ${this.url}`, this.config);
				}

				if (this.config.expectStream) {
					const stream = new Stream();
					const reader = result.body?.getReader();
					if (reader) {
						const decoder = new TextDecoder();
						let buffer = '';
						reader.read().then(({ done, value }) => {
							try {
								if (done) return;
								buffer += decoder.decode(value, { stream: true });
								const parts = buffer.split('\n\n');
								buffer = parts.pop() ?? '';
								for (const part of parts) {
									if (part === 'end') {
										stream.end();
										reader.cancel();
										return;
									}
									stream.add(JSON.parse(part));
								}
							} catch (error) {
								console.error(error);
							}
						});
					}
					return stream;
				}

				return result.json();
			});

			this.promise.then((r) => (this.response = r));

			return this.promise;
		}

		get id() {
			return `${this.url}${this.method}${JSON.stringify(Object.entries(this.config).sort((a, b) => a[0].localeCompare(b[0])))}`;
		}
	}

	/**
	 * Configuration for GET requests.
	 */
	export type GetConfig<T = unknown> = {
		expectStream: boolean;
		headers?: Record<string, string>;
		cache?: boolean;
		parser: z.ZodType<T>;
	};
	/**
	 * Sends a GET request and parses the response.
	 *
	 * @param {string} url - Request URL.
	 * @param {GetConfig<T>} config - Request config.
	 */
	export const get = async <T = unknown>(url: string, config: GetConfig<T>) => {
		return attemptAsync(async () => {
			const sr = new ServerRequest<'get'>(url, 'get', config);
			requests.push(sr);
			return config.parser.parse((await sr.send()).unwrap());
		});
	};

	/**
	 * Configuration for POST requests.
	 */
	export type PostConfig<T = unknown> = {
		expectStream: boolean;
		headers?: Record<string, string>;
		body: unknown;
		cache?: boolean;
		parser: z.ZodType<T>;
	};
	/**
	 * Sends a POST request and parses the response.
	 *
	 * @param {string} url - Request URL.
	 * @param {PostConfig<T>} config - Request config.
	 */
	export const post = async <T = unknown>(url: string, config: PostConfig<T>) => {
		return attemptAsync(async () => {
			const sr = new ServerRequest<'post'>(url, 'post', config);
			requests.push(sr);
			return config.parser.parse((await sr.send()).unwrap());
		});
	};

	/**
	 * Sets metadata header value for subsequent requests.
	 *
	 * @param {string} key - Header key (without X- prefix).
	 * @param {string} value - Header value.
	 */
	export const setMeta = (key: string, value: string) => {
		metadata[key] = value;
		Struct.headers.set(key, value);
	};

	/**
	 * Uploads a list of files using XMLHttpRequest.
	 *
	 * @param {string} url - Upload URL.
	 * @param {FileList} files - Files to upload.
	 * @param {{ headers?: Record<string, string>; body?: unknown }} [config] - Optional config.
	 */
	export const uploadFiles = (
		url: string,
		files: FileList,
		config?: {
			headers?: Record<string, string>;
			body?: unknown;
		}
	) => {
		const emitter = new EventEmitter<{
			progress: ProgressEvent<EventTarget>;
			complete: ProgressEvent<EventTarget>;
			error: Error;
		}>();
		attemptAsync(async () => {
			const formData = new FormData();
			for (const file of files) {
				formData.append('file', file);
			}

			const xhr = new XMLHttpRequest();
			xhr.open('POST', url, true);
			xhr.setRequestHeader('Content-Type', 'multipart/form-data');
			xhr.setRequestHeader('X-File-Count', files.length.toString());

			if (config?.headers) {
				for (const [key, value] of Object.entries(config.headers)) {
					xhr.setRequestHeader(key, value);
				}
			}

			let body = '{}';
			if (config?.body) {
				body = JSON.stringify(config.body);
			}

			xhr.setRequestHeader('X-Body', body);

			xhr.upload.onprogress = (e) => {
				emitter.emit('progress', e);
			};

			xhr.upload.onerror = (e) => {
				console.error('Upload error:', e);
				emitter.emit('error', new Error('Upload failed'));
			};

			xhr.upload.onloadend = (e) => {
				if (xhr.readyState === 4) {
					emitter.emit('complete', e);

					const interval = setInterval(() => {
						if (xhr.readyState === 4) {
							clearInterval(interval);
							emitter.emit('complete', e);
						}
					}, 10);
				}
			};
		}).then((r) => {
			if (r.isErr()) {
				emitter.emit('error', r.error);
			}
		});
		return emitter;
	};
}
