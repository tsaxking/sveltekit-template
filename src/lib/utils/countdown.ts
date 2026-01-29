/**
 * @fileoverview Countdown timer store utility.
 *
 * @example
 * import { Countdown } from '$lib/utils/countdown';
 * const countdown = new Countdown(new Date(Date.now() + 60000));
 * const stop = countdown.start();
 */
import { type Writable } from 'svelte/store';
import { Loop } from 'ts-utils/loop';

/**
 * Snapshot of countdown state.
 *
 * @property {boolean} reached - Whether the target time is reached.
 * @property {Date} target - Target date.
 * @property {number} seconds - Remaining seconds.
 * @property {number} minutes - Remaining minutes.
 * @property {number} hours - Remaining hours.
 * @property {number} days - Remaining days.
 * @property {string} string - Human readable string.
 * @property {number} timeLeft - Remaining milliseconds.
 */
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

/**
 * Countdown store that updates once per second.
 */
export class Countdown implements Writable<CountdownType> {
	/**
	 * @param {Date} target - Target date/time.
	 */
	constructor(public target: Date) {}

	/**
	 * Computes the current countdown snapshot.
	 */
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

	/** Subscribers for store updates. */
	private readonly subscribers = new Set<(value: CountdownType) => void>();

	/**
	 * Subscribes to countdown updates.
	 */
	subscribe(run: (value: CountdownType) => void) {
		this.subscribers.add(run);
		run(this.getCountdown());
		return () => {
			this.subscribers.delete(run);
		};
	}

	/**
	 * Notifies subscribers of the latest countdown state.
	 */
	inform() {
		const countdown = this.getCountdown();
		for (const subscriber of this.subscribers) {
			subscriber(countdown);
		}
	}

	/**
	 * Sets countdown state and notifies subscribers.
	 */
	set(countdown: CountdownType) {
		this.target = countdown.target;
		for (const subscriber of this.subscribers) {
			subscriber(countdown);
		}
	}

	/**
	 * Updates the target date.
	 */
	setTarget(target: Date) {
		this.target = target;
		this.inform();
	}

	/**
	 * Updates countdown state with a callback.
	 */
	update(updater: (countdown: CountdownType) => CountdownType) {
		this.set(updater(this.getCountdown()));
	}

	/** Whether the countdown loop is running. */
	private _running = false;
	/** Stop handler for the loop. */
	public stop = () => {};

	/**
	 * Starts the countdown update loop.
	 */
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
