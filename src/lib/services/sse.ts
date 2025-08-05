import { browser } from '$app/environment';
import { EventEmitter } from 'ts-utils/event-emitter';
import { decode } from 'ts-utils/text';
import { notify } from '../utils/prompts';
import { z } from 'zod';
import { Requests } from '../utils/requests';
import { Random } from 'ts-utils/math';

class SSE {
	public readonly uuid = Random.uuid();
	private readonly emitter = new EventEmitter();
	private _latency: number[] = [];
	private lastAckedId = 0;
	private isDisconnected = false;
	private isReconnecting = false;
	private disconnect: () => void = () => {};
	private reconnectAttempt = 0;
	private readonly maxBackoff = 30000;
	private pingFailures = 0;

	public on = this.emitter.on.bind(this.emitter);
	public off = this.emitter.off.bind(this.emitter);
	public once = this.emitter.once.bind(this.emitter);

	init(enable: boolean) {
		if (!enable) return;
		this.connect();

		const userActivityEvents = ['mousedown', 'mouseover', 'touchstart', 'scroll'];
		let inactivityTimeout: ReturnType<typeof setTimeout>;

		const resetInactivityTimer = () => {
			if (inactivityTimeout) clearTimeout(inactivityTimeout);
			inactivityTimeout = setTimeout(
				() => {
					this.disconnect();
					this.isDisconnected = true;
				},
				1000 * 60 * 5
			); // 5 mins
			if (this.isDisconnected) {
				this.isDisconnected = false;
				this.disconnect = this.connect();
			}
		};

		userActivityEvents.forEach((event) => document.addEventListener(event, resetInactivityTimer));

		document.addEventListener('visibilitychange', () => {
			if (document.hidden) {
				setTimeout(() => {
					if (document.hidden) {
						this.disconnect();
						this.isDisconnected = true;
					}
				}, 1000 * 60);
			} else if (this.isDisconnected) {
				this.isDisconnected = false;
				this.disconnect = this.connect();
			}
		});
	}

	connect() {
		const establishConnection = () => {
			Requests.setMeta('sse', this.uuid);
			const source = new EventSource(`/sse/init/${this.uuid}?lastAck=${this.lastAckedId}`);

			const handleConnect = () => {
				console.log(`SSE connected: ${this.uuid}`);
				this.emitter.emit('connect', undefined);
				this.reconnectAttempt = 0;
				this.pingFailures = 0;
			};

			const handleMessage = (event: MessageEvent) => {
				try {
					const parsed = z
						.object({
							id: z.number(),
							event: z.string(),
							data: z.unknown()
						})
						.parse(JSON.parse(decode(event.data)));

					if (parsed.event === 'close') {
						source.close();
					} else if (parsed.event === 'notification') {
						const notifSchema = z.object({
							title: z.string(),
							message: z.string(),
							severity: z.enum(['info', 'warning', 'danger', 'success'])
						});
						const notif = notifSchema.safeParse(parsed.data);
						if (notif.success) {
							notify({
								color: notif.data.severity,
								title: notif.data.title,
								message: notif.data.message,
								autoHide: 5000
							});
						}
					} else if (parsed.event !== 'ping') {
						this.emitter.emit(parsed.event, parsed.data);
					}

					this.ack(parsed.id);
				} catch (err) {
					console.error('Failed to parse SSE event:', err);
				}
			};

			const handleError = () => {
				console.warn('SSE connection lost, retrying...');
				source.close();
				if (!this.isReconnecting) {
					this.isReconnecting = true;
					const backoff = Math.min(1000 * 2 ** this.reconnectAttempt, this.maxBackoff);
					this.reconnectAttempt++;
					setTimeout(() => {
						this.disconnect = establishConnection();
						this.isReconnecting = false;
					}, backoff);
				}
			};

			source.addEventListener('open', handleConnect);
			source.addEventListener('message', handleMessage);
			source.addEventListener('error', handleError);

			const closeConnection = () => {
				source.close();
				source.removeEventListener('open', handleConnect);
				source.removeEventListener('message', handleMessage);
				source.removeEventListener('error', handleError);
				window.removeEventListener('beforeunload', closeConnection);
			};

			window.addEventListener('beforeunload', closeConnection);

			return () => closeConnection();
		};

		this.disconnect();
		this.disconnect = establishConnection();

		const pingInterval = setInterval(async () => {
			if (this.isDisconnected) return clearInterval(pingInterval);
			const success = await this.ping();
			if (!success) {
				this.pingFailures++;
				if (this.pingFailures >= 3) {
					this.disconnect();
					this.disconnect = establishConnection();
				}
			} else {
				this.pingFailures = 0;
			}
		}, 5000);

		return this.disconnect.bind(this);
	}

	private ack(id: number) {
		this.lastAckedId = id;
		fetch(`/sse/ack/${this.uuid}/${id}`);
	}

	private async ping() {
		const start = performance.now();
		try {
			const res = await fetch(`/sse/ping/${this.uuid}`);
			const end = performance.now();
			const latency = end - start;
			const text = await res.text();
			const [, serverLatency] = text.split(':');
			if (!isNaN(+serverLatency)) {
				this._latency.push(latency - +serverLatency);
			} else {
				this._latency.push(latency);
			}
			if (this._latency.length > 3) this._latency.shift();
			return res.ok;
		} catch {
			return false;
		}
	}

	public waitForConnection(timeout: number) {
		return new Promise<void>((resolve, reject) => {
			let settled = false;
			if (!this.isDisconnected) {
				return resolve();
			}
			this.once('connect', () => {
				if (settled) return;
				settled = true;
				clearTimeout(timer);
				resolve();
			});
			const timer = setTimeout(() => {
				if (settled) return;
				settled = true;
				reject(new Error(`SSE connection timed out after ${timeout}ms`));
			}, timeout);
		});
	}

	get latency() {
		if (this._latency.length === 0) return 0;
		return this._latency.reduce((a, b) => a + b, 0) / this._latency.length;
	}
}

export const sse = new SSE();
sse.init(browser);
