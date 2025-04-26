import { type Writable } from 'svelte/store';
import { Loop } from 'ts-utils/loop';

type CountdownType = {
	reached: boolean;
	target: Date;
	seconds: number;
	minutes: number;
	hours: number;
	days: number;
	string: string;
	timeLeft: number;
};

export class Countdown implements Writable<CountdownType> {
	constructor(public target: Date) {}

	getCountdown(): CountdownType {
		const now = new Date();
		const diff = this.target.getTime() - now.getTime();
		const seconds = Math.floor(diff / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);
		let str = '';
		if (days) str += `${days}d `;
		if (hours % 24) str += `${hours % 24}h `;
		if (minutes % 60) str += `${minutes % 60}m `;
		if (seconds % 60) str += `${seconds % 60}s`;
		if (!str) str = '0s';
		if (str.length > 0 && str[str.length - 1] === ' ') str = str.slice(0, -1); // remove trailing space
		if (str.length > 0 && str[str.length - 1] === 'd') str = str.slice(0, -1); // remove trailing d

		return {
			reached: diff <= 0,
			target: this.target,
			seconds: seconds % 60,
			minutes: minutes % 60,
			hours: hours % 24,
			days: days,
			string: str,
			timeLeft: diff
		};
	}

	private readonly subscribers = new Set<(value: CountdownType) => void>();

	subscribe(run: (value: CountdownType) => void) {
		this.subscribers.add(run);
		run(this.getCountdown());
		return () => {
			this.subscribers.delete(run);
		};
	}

	inform() {
		const countdown = this.getCountdown();
		for (const subscriber of this.subscribers) {
			subscriber(countdown);
		}
	}

	set(countdown: CountdownType) {
		this.target = countdown.target;
		for (const subscriber of this.subscribers) {
			subscriber(countdown);
		}
	}

	setTarget(target: Date) {
		this.target = target;
		this.inform();
	}

	update(updater: (countdown: CountdownType) => CountdownType) {
		this.set(updater(this.getCountdown()));
	}

	private _running = false;
	public stop = () => {};

	start() {
		if (this._running) return this.stop;
		this._running = true;

		const loop = new Loop(() => {
			this.update((countdown) => {
				return countdown;
			});
		}, 1000);

		loop.start();
		this.stop = () => {
			loop.stop();
			this._running = false;
		};
		this.inform();
		return this.stop;
	}
}
