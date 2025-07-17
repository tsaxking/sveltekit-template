import { browser } from '$app/environment';
import { EventEmitter } from 'ts-utils/event-emitter';
import { decode } from 'ts-utils/text';
import { notify } from '../utils/prompts';
import { z } from 'zod';
import { Requests } from '../utils/requests';
import { Random } from 'ts-utils/math';

class SSE {
	public readonly uuid = Random.uuid();
	public readonly emitter = new EventEmitter();

	public on = this.emitter.on.bind(this.emitter);
	public off = this.emitter.off.bind(this.emitter);
	public once = this.emitter.once.bind(this.emitter);
	private emit = this.emitter.emit.bind(this.emitter);

	private isDisconnected = false;
	private isReconnecting = false;
	private disconnect: () => void = () => {};

	private reconnectAttempt = 0;
	private readonly maxBackoff = 30000; // max 30 seconds

	constructor() {
		// console.log(`SSE constructor called: ${this.uuid}`);
	}

	init(browser: boolean) {
		if (!browser) return;

		this.connect();

		const events = ['mousedown', 'mouseover', 'touch', 'scroll'];

		let timeout: ReturnType<typeof setTimeout>;

		const onEvent = () => {
			if (timeout) clearTimeout(timeout);
			timeout = setTimeout(
				() => {
					this.disconnect();
					this.isDisconnected = true;
				},
				1000 * 60 * 5
			); // 5 minutes

			if (this.isDisconnected) {
				this.isDisconnected = false;
				this.disconnect = this.connect();
			}
		};

		for (const event of events) {
			document.addEventListener(event, onEvent);
		}
	}

	connect() {
		const connect = () => {
			// console.log('connect.connect()');
			// this.uuid = Random.uuid();
			Requests.setMeta('sse', this.uuid);
			const source = new EventSource(`/sse/init/${this.uuid}`);

			const onConnect = () => {
				console.log(`SSE connection established: ${this.uuid}`);
				this.emit('connect', undefined);
				this.reconnectAttempt = 0; // reset backoff on successful connect
			};

			const onMessage = (event: MessageEvent) => {
				try {
					const e = z
						.object({
							id: z.number(),
							event: z.string(),
							data: z.unknown()
						})
						.parse(JSON.parse(decode(event.data)));

					if (!Object.hasOwn(e, 'event')) {
						return console.error('Invalid event (missing .event)', e);
					}
					if (!Object.hasOwn(e, 'data')) {
						return console.error('Invalid data (missing .data)', e);
					}

					if (e.event === 'close') {
						source.close();
					}

					if (e.event === 'notification') {
						const parsed = z
							.object({
								title: z.string(),
								message: z.string(),
								severity: z.enum(['info', 'warning', 'danger', 'success'])
							})
							.safeParse(e.data);

						if (parsed.success) {
							notify({
								color: parsed.data.severity,
								title: parsed.data.title,
								message: parsed.data.message,
								autoHide: 5000
							});
						}
						return;
					}

					if (!['close', 'ping'].includes(e.event)) {
						this.emit(e.event, e.data);
					}

					this.ack(e.id);
				} catch (error) {
					console.error(error);
				}
			};

			const onError = () => {
				console.warn('SSE connection lost. Attempting reconnect.');
				source.close();

				if (!this.isReconnecting) {
					this.isReconnecting = true;

					const backoff = Math.min(1000 * 2 ** this.reconnectAttempt, this.maxBackoff);
					this.reconnectAttempt++;

					setTimeout(() => {
						this.disconnect = connect();
						this.isReconnecting = false;
					}, backoff);
				}
			};

			source.addEventListener('open', onConnect);
			source.addEventListener('message', onMessage);
			source.addEventListener('error', onError);

			const close = () => {
				source.close();
				source.removeEventListener('open', onConnect);
				source.removeEventListener('message', onMessage);
				source.removeEventListener('error', onError);
			};

			window.addEventListener('beforeunload', close);

			return () => {
				close();
				window.removeEventListener('beforeunload', close);
			};
		};

		this.disconnect();
		this.disconnect = connect();

		const interval = setInterval(async () => {
			if (this.isDisconnected) return clearInterval(interval);
			if (!(await this.ping())) {
				this.disconnect();
				this.disconnect = connect();
			}
		}, 5000);

		return this.disconnect.bind(this);
	}

	private ack(id: number) {
		// console.log(`${this.uuid} Client acknowledging message with ID:`, id);
		fetch(`/sse/ack/${this.uuid}/${id}`);
	}

	private ping() {
		// console.log('Pinging SSE server...');
		return fetch(`/sse/ping/${this.uuid}`).then((res) => res.ok);
	}

	public waitForConnection(timeout: number) {
		return new Promise<void>((res, rej) => {
			let settled = false;
			if (!this.isDisconnected) {
				return res();
			}
			this.once('connect', () => {
				if (settled) return;
				settled = true;
				clearTimeout(t);
				res();
			});
			const t = setTimeout(() => {
				if (settled) return;
				settled = true;
				rej(new Error(`SSE connection timed out after ${timeout}ms`));
			}, timeout);
		});
	}
}

export const sse = new SSE();
sse.init(browser);
