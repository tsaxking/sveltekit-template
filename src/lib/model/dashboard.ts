import { browser } from '$app/environment';
import { writable, type Subscriber, type Unsubscriber, type Writable } from 'svelte/store';
import { EventEmitter } from 'ts-utils/event-emitter';
import { attempt } from 'ts-utils/check';
import { z } from 'zod';
import type { Icon } from '$lib/types/icons';

export namespace Dashboard {
	export const getGridSize = () => {
		if (!browser) return 'xl';
		const width = window.innerWidth;
		switch (true) {
			case width < 576:
				return 'xs';
			case width < 768:
				return 'sm';
			case width < 992:
				return 'md';
			case width < 1200:
				return 'lg';
			default:
				return 'xl';
		}
	};

	export const sizes = {
		xs: 12,
		sm: 12,
		md: 12,
		lg: 12,
		xl: 12
	};

	// const order: (keyof typeof sizes)[] = ['xs', 'sm', 'md', 'lg', 'xl'];

	type CardData = {
		show: boolean;
		maximized: boolean;
		width: number;
		height: number;
	};

	export class Dashboard {
		private readonly listeners = new Set<() => void>();

		constructor(
			public readonly config: {
				name: string;
				id: string;
				cards: Card[];
			}
		) {
			const hidden = this.pull();
			this.hiddenCards.set(hidden);
			for (const card of config.cards) {
				if (hidden.has(card)) {
					card.hide();
				}
				this.listeners.add(
					card.on('show', (show) => {
						this.hiddenCards.update((cards) => {
							if (show) {
								cards.delete(card);
							} else {
								cards.add(card);
							}
							return cards;
						});
						this.save();
					})
				);
			}
		}

		get id() {
			return this.config.id;
		}

		get name() {
			return this.config.name;
		}

		get cards() {
			return this.config.cards;
		}

		public hiddenCards = writable(new Set<Card>());

		save() {
			return attempt(() => {
				if (!browser) return;
				const hidden = JSON.stringify(
					[...Card.cards.values()].filter((card) => !card.state.show).map((card) => card.config.id)
				);
				localStorage.setItem(`v1-dashboard-cards-${this.id}`, hidden);
			});
		}

		pull() {
			if (!browser) return new Set<Card>();
			const hidden = localStorage.getItem(`v1-dashboard-cards-${this.id}`);
			if (!hidden) return new Set<Card>();
			const arr = z.array(z.string()).safeParse(JSON.parse(hidden));
			if (!arr.success) {
				console.error(arr.error);
				return new Set<Card>();
			}
			return new Set<Card>(
				arr.data.map((id) => Card.cards.get(id)).filter((card): card is Card => !!card)
			);
		}
	}

	export class Card implements Writable<CardData> {
		public static readonly cards = new Map<string, Card>();

		public state: CardData;

		private readonly subscribers = new Set<(value: CardData) => void>();

		private readonly em = new EventEmitter<{
			show: boolean;
			maximized: boolean;
		}>();

		public readonly on = this.em.on.bind(this.em);
		public readonly off = this.em.off.bind(this.em);
		public readonly once = this.em.once.bind(this.em);
		public readonly emit = this.em.emit.bind(this.em);

		constructor(
			public readonly config: {
				name: string;
				icon: Icon;
				id: string;
				size: {
					xs?: { width: number; height: number };
					sm?: { width: number; height: number };
					md?: { width: number; height: number };
					lg?: { width: number; height: number };
					xl?: { width: number; height: number };
					width: number;
					height: number;
				};
			}
		) {
			if (!Number.isInteger(config.size.width) || !Number.isInteger(config.size.height)) {
				throw new Error('Width and height must be integers');
			}

			Card.cards.set(config.id, this);

			this.state = {
				show: true,
				maximized: false,
				width: this.config.size.width,
				height: this.config.size.height
			};

			// const res = pull();
			// if (res.isOk()) {
			// 	if (res.value.has(config.name)) {
			// 		this.state.show = false;
			// 	}
			// }
		}

		getSize() {
			const size = getGridSize();

			// if any size is defined and smaller than the current size, use it
			// for (const s of order) {
			// 	if (this.config.size[s] && order.indexOf(s) <= order.indexOf(size)) {
			// 		return this.config.size[s];
			// 	}
			// }
			const s = this.config.size[size];
			if (s) {
				if (s.width > sizes[size]) {
					return {
						width: sizes[size],
						height: s.height
					};
				}
				return s;
			}

			return {
				width: this.config.size.width,
				height: this.config.size.height
			};
		}

		get width() {
			return this.config.size.width;
		}

		get height() {
			return this.config.size.height;
		}

		set(value: CardData) {
			this.state = value;
			this.subscribers.forEach((subscriber) => subscriber(this.state));
			// if (this.state.show) {
			// 	hiddenCards.update((cards) => {
			// 		cards.delete(this);
			// 		return cards;
			// 	});
			// } else {
			// 	hiddenCards.update((cards) => {
			// 		cards.add(this);
			// 		return cards;
			// 	});
			// }

			// save();
		}

		update(fn: (value: CardData) => CardData) {
			this.set(fn(this.state));
		}

		private _onAllUnsubscribe?: () => void;

		subscribe(run: Subscriber<CardData>, invalidate?: () => void): Unsubscriber {
			this.subscribers.add(run);
			run(this.state);

			return () => {
				this.subscribers.delete(run);
				invalidate?.();
				if (this.subscribers.size === 0) this._onAllUnsubscribe?.();
			};
		}

		public onAllUnsubscribe(fn: () => void) {
			this._onAllUnsubscribe = fn;
		}

		show() {
			this.update((state) => ({
				...state,
				show: true,
				maximized: false
			}));
			this.emit('show', true);
		}

		hide() {
			this.update((state) => ({
				...state,
				show: false,
				maximized: false
			}));
			this.emit('show', false);
		}

		minimize() {
			this.update((state) => ({ ...state, maximized: false }));
			this.emit('maximized', false);
		}

		maximize() {
			this.update((state) => ({ ...state, maximized: true }));
			this.emit('maximized', true);
		}

		resize() {
			this.update((state) => ({
				...state,
				width: this.getSize().width,
				height: this.getSize().height
			}));
		}
	}
}
