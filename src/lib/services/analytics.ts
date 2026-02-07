/**
 * @fileoverview Client-side analytics activity tracker.
 *
 * Tracks active time on a page and reports it to the server on unload or
 * inactivity.
 *
 * @example
 * import { init } from '$lib/services/analytics';
 * init();
 */
import { browser } from '$app/environment';
import { attempt } from 'ts-utils/check';
import { Loop } from 'ts-utils/loop';
import * as remote from '$lib/remotes/analytics.remote';

let called = false;
/**
 * Sends the final activity duration to the server.
 *
 * @param {number} seconds - Active duration in seconds.
 */
const close = (seconds: number) => {
	return attempt(() => {
		if (called || !browser) return;
		called = true;

		remote.close({
			page: window.location.pathname,
			duration: seconds
		});
	});
};

/**
 * Initializes browser activity tracking.
 */
export const init = () => {
	return attempt(() => {
		if (!browser) throw new Error('This analytics.init() can only be called in the browser');

		let duration = 0;

		const events = [
			'mousedown',
			'mousemove',
			'mouseup',
			'keydown',
			'keyup',
			'touchstart',
			'touchmove',
			'touchend',
			'scroll',
			'click',
			'wheel',
			'contextmenu',
			'focus',
			'blur',
			'resize',
			'orientationchange',
			'pointerdown',
			'pointermove',
			'pointerup',
			'pointercancel'
		];

		const inactive = () => {
			isActive = false;
			loop.stop();
			for (const e of events) {
				window.addEventListener(e, active, { passive: true });
			}
		};
		const TIMEOUT_DURATION = 1000 * 60 * 5; // 5 minutes
		const LOOP_DURATION = 10_000;

		let timeout: ReturnType<typeof setTimeout>;
		let lastTick = Date.now();
		const loop = new Loop(() => {
			duration += Date.now() - lastTick;
			lastTick = Date.now();
		}, LOOP_DURATION);
		let isActive = false;

		const active = () => {
			if (isActive) return;
			isActive = true;
			if (timeout) clearTimeout(timeout);
			lastTick = Date.now();
			timeout = setTimeout(inactive, TIMEOUT_DURATION);

			loop.start();

			for (const e of events) {
				window.removeEventListener(e, active);
			}
		};

		window.addEventListener('beforeunload', () => {
			duration += Date.now() - lastTick;
			close(Math.round(duration / 1000));
		});
		active();

		document.addEventListener('visibilitychange', () => {
			if (document.hidden) {
				inactive();
			} else if (isActive) {
				active();
			}
		});
	});
};
