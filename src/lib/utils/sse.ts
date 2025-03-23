import { browser } from '$app/environment';
import { EventEmitter } from 'ts-utils/event-emitter';
import { decode } from 'ts-utils/text';
import { notify } from './prompts';
import { z } from 'zod';
import { Requests } from './requests';
import { Random } from 'ts-utils/math';

class SSE {
	public uuid = Random.uuid();
	public readonly emitter = new EventEmitter();

	public on = this.emitter.on.bind(this.emitter);
	public off = this.emitter.off.bind(this.emitter);
	public once = this.emitter.once.bind(this.emitter);
	private emit = this.emitter.emit.bind(this.emitter);

	init(browser: boolean) {
		if (browser) {
			const d = this.connect();

			// the disconnect function is dynamic, so I run it dynamically rather than pulling it
			const disconnect = () => d.disconnect();

			const events = ['mousedown', 'mouseover', 'touch', 'scroll'];

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			let timeout: any;

			// if there's no interaction for 5 minutes, disconnect
			const onEvent = () => {
				if (timeout) clearTimeout(timeout);
				setTimeout(
					() => {
						disconnect();
						this.stop = true;
					},
					1000 * 60 * 5
				); // 5 minutes
				if (this.stop) {
					this.stop = false;
					this.connect();
				}
			};

			for (const event of events) {
				document.addEventListener(event, onEvent);
			}
		}
	}

	connect() {
		const connect = () => {
			this.uuid = Random.uuid();
			Requests.setMeta('sse', this.uuid);
			const source = new EventSource(`/sse/init/${this.uuid}`);

			source.addEventListener('error', (e) => console.error('Error:', e));

			const onConnect = () => {
				this.emit('connect', undefined);
			};

			source.addEventListener('open', onConnect);

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
						return console.error('Invalid data (mising .data)', e);
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
						if (parsed.success)
							notify({
								type: 'alert',
								color: parsed.data.severity,
								title: parsed.data.title,
								message: parsed.data.message,
								autoHide: 5000
							});
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

			source.addEventListener('message', onMessage);

			const close = () => {
				source.close();
				source.removeEventListener('open', onConnect);
				source.removeEventListener('message', onMessage);
				source.removeEventListener('error', console.error);
			};

			window.addEventListener('beforeunload', close);

			return () => {
				close();
				window.removeEventListener('beforeunload', close);
			};
		};

		const toReturn = {
			disconnect: connect()
		};

		// ping the server every 10 seconds, if the server does not respond, reconnect
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const interval: any = setInterval(async () => {
			if (this.stop) return clearInterval(interval);
			if (!(await this.ping())) {
				toReturn.disconnect();
				toReturn.disconnect = connect();
			}
		}, 10000);
		// connect();
		return toReturn;
	}

	private ack(id: number) {
		fetch(`/sse/ack/${this.uuid}/${id}`);
	}

	private ping() {
		return fetch('/sse/ping').then((res) => res.ok);
	}

	private stop = false;
}

export const sse = new SSE();

sse.init(browser);
