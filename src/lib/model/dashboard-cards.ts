import { writable, type Subscriber, type Unsubscriber, type Writable } from 'svelte/store';
import { attempt } from 'ts-utils/check';
import { z } from 'zod';

export namespace Dashboard {
	// export class Dashboard {
	// 	public static readonly dashboards = new Map<string, Dashboard>();

	// 	constructor(
	// 		public readonly config: {
	// 			name: string;
	// 			id: string;
	// 			cards: Card[];
	// 		}
	// 	) {
	// 		Dashboard.dashboards.set(config.id, this);
	// 	}

	// 	get cards() {
	// 		return this.config.cards;
	// 	}

	// 	get name() {
	// 		return this.config.name;
	// 	}

	// 	get id() {
	// 		return this.config.id;
	// 	}

	// 	get visibleCards() {
	// 		return this.cards.filter((card) => card.state.show);
	// 	}

	// 	get hiddenCards() {
	// 		return this.cards.filter((card) => !card.state.show);
	// 	}

	// 	save() {

	// 	}
	// };

	type CardData = {
		show: boolean;
		maximized: boolean;
	};

	export const hiddenCards = writable(new Set<Card>());

	export class Card implements Writable<CardData> {
		public static readonly cards = new Map<string, Card>();

		public state: CardData = {
			show: true,
			maximized: false
		};

		private readonly subscribers = new Set<(value: CardData) => void>();

		constructor(
			public readonly config: {
				name: string;
				icon: string;
				iconType: 'bi' | 'fa' | 'material-icons';
				id: string;
				width: number;
				height: number;
			}
		) {
			if (!Number.isInteger(config.width) || !Number.isInteger(config.height)) {
				throw new Error('Width and height must be integers');
			}

			Card.cards.set(config.id, this);

			const res = pull();
			if (res.isOk()) {
				if (res.value.has(config.name)) {
					this.state.show = false;
				}
			}
		}

		get width() {
			return this.config.width;
		}

		get height() {
			return this.config.height;
		}

		set(value: CardData) {
			this.state = value;
			this.subscribers.forEach((subscriber) => subscriber(this.state));
			if (this.state.show) {
				hiddenCards.update((cards) => {
					cards.delete(this);
					return cards;
				});
			} else {
				hiddenCards.update((cards) => {
					cards.add(this);
					return cards;
				});
			}

			save();
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
		}

		hide() {
			this.update((state) => ({
				...state,
				show: false,
				maximized: false
			}));
		}

		minimize() {
			this.update((state) => ({ ...state, maximized: true }));
		}

		maximize() {
			this.update((state) => ({ ...state, maximized: false }));
		}
	}

	const save = () => {
		return attempt(() => {
			const hidden = JSON.stringify(
				[...Card.cards.values()].filter((card) => !card.state.show).map((card) => card.config.id)
			);
			localStorage.setItem(`v1-dashboard-cards-${location.pathname}`, hidden);
		});
	};

	const pull = () => {
		return attempt(() => {
			const hidden = localStorage.getItem(`v1-dashboard-cards-${location.pathname}`);
			if (!hidden) return new Set<string>();
			const arr = z.array(z.string()).safeParse(JSON.parse(hidden));
			if (!arr.success) {
				console.error(arr.error);
				return new Set();
			}
			return new Set(arr.data);
		});
	};
}
