/**
 * @fileoverview Dashboard layout model with cards, persistence, and sizing helpers.
 *
 * @example
 * import { Dashboard } from '$lib/model/dashboard';
 * const card = new Dashboard.Card({
 *   name: 'Example',
 *   icon: { type: 'material-icons', name: 'home' },
 *   id: 'example-card',
 *   size: { width: 3, height: 2 }
 * });
 * const dash = new Dashboard.Dashboard({ name: 'Main', id: 'main', cards: [card] });
 */
import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import { EventEmitter } from 'ts-utils/event-emitter';
import { attempt } from 'ts-utils/check';
import { z } from 'zod';
import type { Icon } from '$lib/types/icons';
import { WritableArray, WritableBase } from '$lib/services/writables';

/**
 * Dashboard data models and helpers.
 */
export namespace Dashboard {
	/**
	 * Returns the current grid size bucket based on window width.
	 */
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

	/**
	 * Default column counts per breakpoint.
	 */
	export const sizes = {
		xs: 12,
		sm: 12,
		md: 12,
		lg: 12,
		xl: 12
	};

	// const order: (keyof typeof sizes)[] = ['xs', 'sm', 'md', 'lg', 'xl'];

	/**
	 * Stored card state persisted in `WritableBase`.
	 *
	 * @property {boolean} show - Whether the card is visible.
	 * @property {boolean} maximized - Whether the card is maximized.
	 * @property {number} width - Current grid width.
	 * @property {number} height - Current grid height.
	 */
	type CardData = {
		show: boolean;
		maximized: boolean;
		width: number;
		height: number;
	};

	/**
	 * Size rules for a card, including optional breakpoints.
	 *
	 * @property xs - Breakpoint size for extra-small screens.
	 * @property sm - Breakpoint size for small screens.
	 * @property md - Breakpoint size for medium screens.
	 * @property lg - Breakpoint size for large screens.
	 * @property xl - Breakpoint size for extra-large screens.
	 * @property width - Default width.
	 * @property height - Default height.
	 */
	type CardSize = {
		xs?: { width: number; height: number; order?: number };
		sm?: { width: number; height: number; order?: number };
		md?: { width: number; height: number; order?: number };
		lg?: { width: number; height: number; order?: number };
		xl?: { width: number; height: number; order?: number };
		width: number;
		height: number;
	};

	/**
	 * Card configuration.
	 *
	 * @property name - Display name.
	 * @property icon - Icon definition.
	 * @property id - Unique id.
	 * @property size - Size rules.
	 */
	type CardConfig = {
		name: string;
		icon: Icon;
		id: string;
		size: CardSize;
	};

	/**
	 * Dashboard configuration.
	 *
	 * @property name - Display name.
	 * @property id - Unique id used for persistence.
	 * @property cards - Card instances to manage.
	 */
	type DashboardConfig = {
		name: string;
		id: string;
		cards: Card[];
	};

	/**
	 * Dashboard container managing a collection of cards.
	 */
	export class Dashboard extends WritableArray<Card> {
		private readonly listeners = new Set<() => void>();

		/**
		 * Creates a dashboard.
		 *
		 * @param config - Dashboard configuration.
		 */
		constructor(public readonly config: DashboardConfig) {
			super(config.cards);
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

		/** Dashboard id used for storage keys. */
		get id() {
			return this.config.id;
		}

		/** Dashboard display name. */
		get name() {
			return this.config.name;
		}

		/** Managed card instances. */
		get cards() {
			return this.config.cards;
		}

		/** Cards sorted by order. */
		get orderedCards() {
			const a = new WritableArray(
				[...this.config.cards].sort((a, b) => a.getOrder() - b.getOrder())
			);

			a.onAllUnsubscribe(
				this.subscribe(() => {
					a.set([...this.config.cards].sort((a, b) => a.getOrder() - b.getOrder()));
				})
			);

			return a;
		}

		/** Set of currently hidden cards. */
		public hiddenCards = writable(new Set<Card>());

		/** Persists hidden card ids to localStorage. */
		save() {
			return attempt(() => {
				if (!browser) return;
				const hidden = JSON.stringify(
					[...Card.cards.values()].filter((card) => !card.state.show).map((card) => card.config.id)
				);
				localStorage.setItem(`v1-dashboard-cards-${this.id}`, hidden);
			});
		}

		/** Restores hidden cards from localStorage. */
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

		/** Attaches resize listeners for reflow. */
		init() {
			if (!browser) return;
			document.addEventListener('resize', () => {
				this.inform();
			});
		}
	}

	/**
	 * Dashboard card state and configuration.
	 */
	export class Card extends WritableBase<CardData> {
		public static readonly cards = new Map<string, Card>();

		public state: CardData;

		private readonly em = new EventEmitter<{
			show: boolean;
			maximized: boolean;
		}>();

		public readonly on = this.em.on.bind(this.em);
		public readonly off = this.em.off.bind(this.em);
		public readonly once = this.em.once.bind(this.em);
		public readonly emit = this.em.emit.bind(this.em);

		/**
		 * Creates a dashboard card.
		 *
		 * @param config - Card configuration.
		 */
		constructor(public readonly config: CardConfig) {
			super({
				show: true,
				maximized: false,
				width: config.size.width,
				height: config.size.height
			});
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

		/** Returns the current size for the active breakpoint. */
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

		/** Display order for the active breakpoint. */
		getOrder() {
			const size = getGridSize();
			const s = this.config.size[size];
			return s?.order ?? 0;
		}

		/** Default width for the card. */
		get width() {
			return this.config.size.width;
		}

		/** Default height for the card. */
		get height() {
			return this.config.size.height;
		}

		/** Shows the card and emits a `show` event. */
		show() {
			this.update((state) => ({
				...state,
				show: true,
				maximized: false
			}));
			this.emit('show', true);
		}

		/** Hides the card and emits a `show` event. */
		hide() {
			this.update((state) => ({
				...state,
				show: false,
				maximized: false
			}));
			this.emit('show', false);
		}

		/** Clears the maximized state and emits `maximized`. */
		minimize() {
			this.update((state) => ({ ...state, maximized: false }));
			this.emit('maximized', false);
		}

		/** Sets the maximized state and emits `maximized`. */
		maximize() {
			this.update((state) => ({ ...state, maximized: true }));
			this.emit('maximized', true);
		}

		/** Recomputes size based on the current breakpoint. */
		resize() {
			this.update((state) => ({
				...state,
				width: this.getSize().width,
				height: this.getSize().height
			}));
		}
	}
}
