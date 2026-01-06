import { browser } from '$app/environment';
import { attempt } from 'ts-utils/check';
import { Loop } from 'ts-utils/loop';

let called = false;
const close = (seconds: number) => {
	return attempt(() => {
		if (called || !browser) return;
		called = true;

		// navigator.sendBeacon('/api/analytics/close', JSON.stringify({
		//     page: window.location.pathname,
		//     duration: seconds,
		// }));

		fetch('/api/analytics/close', {
			body: JSON.stringify({
				page: window.location.pathname,
				duration: seconds
			}),
			method: 'POST'
		});
	});
};

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
