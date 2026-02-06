/**
 * @fileoverview Context menu helper for UI actions.
 *
 * @example
 * import { contextmenu } from '$lib/utils/contextmenu';
 * contextmenu(event, { options: [] });
 */
import { type Icon } from '../types/icons';

/**
 * Options for the context menu
 * @date 3/8/2024 - 6:59:48 AM
 *
 * @export
 * @typedef {ContextMenuOptions}
 */
export type ContextMenuOptions = (
	| {
			action: (e: MouseEvent) => void;
			name: string;
			icon: Icon;
	  }
	| null
	| string
)[];

const ensureContextMenuStyles = () => {
	if (find('#contextmenu-styles')) return;
	const style = create('style');
	style.id = 'contextmenu-styles';
	style.textContent = `
		.contextmenu {
			background: color-mix(in srgb, var(--layer-3, #1f2937) 92%, transparent);
			border: 1px solid rgba(255, 255, 255, 0.06);
			border-radius: 12px;
			box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
			backdrop-filter: blur(6px);
		}
		.contextmenu .contextmenu-item {
			transition: background-color 0.12s ease, color 0.12s ease;
		}
		.contextmenu .contextmenu-item:hover {
			background: color-mix(in srgb, var(--layer-2, #2b3441) 70%, transparent);
		}
		.contextmenu .contextmenu-title {
			font-weight: 600;
			letter-spacing: 0.2px;
		}
		.contextmenu .contextmenu-divider {
			height: 1px;
			background: rgba(255, 255, 255, 0.08);
			border: 0;
			margin: 4px 0;
		}
	`;
	document.head.appendChild(style);
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const rightClickContextMenu = (e: MouseEvent, el: HTMLDivElement, margin = 8) => {
	const browser = {
		h: window.innerHeight,
		w: window.innerWidth
	};

	const pos = {
		x: e.clientX,
		y: e.clientY
	};

	const { width, height } = el.getBoundingClientRect();
	const maxX = Math.max(margin, browser.w - width - margin);
	const maxY = Math.max(margin, browser.h - height - margin);

	return {
		x: clamp(pos.x, margin, maxX),
		y: clamp(pos.y, margin, maxY)
	};
};

/**
 * Adds a context menu to the target
 * @date 3/8/2024 - 6:59:48 AM
 *
 * @param {ContextMenuOptions} options
 * @param {HTMLElement} target
 */
export const contextmenu = (
	event: MouseEvent | PointerEvent,
	config: {
		options: ContextMenuOptions;
		width?: `${number}${'px' | 'rem' | 'em' | '%'}`; // Default width is 200px
	}
) => {
	event.preventDefault();
	const { options, width = '200px' } = config;
	ensureContextMenuStyles();
	const margin = 8;

	const el = create('div');
	el.style.width = width;
	el.classList.add('shadow', 'border-0', 'contextmenu', 'rounded', 'layer-3');
	el.style.position = 'fixed';
	el.style.zIndex = '1000';
	el.style.maxWidth = `calc(100vw - ${margin * 2}px)`;
	el.style.maxHeight = `calc(100vh - ${margin * 2}px)`;
	el.style.visibility = 'hidden';
	const body = create('div');
	body.classList.add('card-body', 'p-0', 'border-0', 'rounded');
	body.style.overflow = 'hidden';
	el.appendChild(body);
	const list = create('ul');
	list.classList.add('list-group', 'list-group-flush', 'border-0', 'p-0');
	list.style.maxHeight = `calc(100vh - ${margin * 4}px)`;
	list.style.overflowY = 'auto';
	body.appendChild(list);
	for (const o of options) {
		const li = create('li');
		li.classList.add('list-group-item', 'border-0', 'p-0', 'm-0');

		if (o === null) {
			const hr = create('hr');
			hr.classList.add('contextmenu-divider');
			list.appendChild(hr);
		} else if (typeof o === 'string') {
			const p = create('p');
			p.classList.add('text-muted', 'p-2', 'm-0', 'contextmenu-title');
			p.textContent = o;
			li.appendChild(p);
			list.appendChild(li);
		} else {
			const button = create('button');
			button.classList.add(
				'btn',
				'btn-dark',
				'border-0',
				'text-start',
				'w-100',
				'p-2',
				'rounded-0',
				'contextmenu-item'
			);
			button.style.display = 'flex';
			button.style.alignItems = 'center';
			button.style.gap = '8px';
			button.type = 'button';
			const icon = create('span');
			icon.classList.add('contextmenu-icon');
			switch (o.icon.type) {
				case 'bootstrap':
					icon.innerHTML = `<i class="bi bi-${o.icon.name}"></i>`;
					break;
				case 'fontawesome':
					icon.innerHTML = `<i class="fa fa-${o.icon.name}"></i>`;
					break;
				case 'material-icons':
					icon.innerHTML = `<span class="material-icons">${o.icon.name}</span>`;
					break;
				case 'material-symbols':
					icon.innerHTML = `<span class="material-symbols-outlined">${o.icon.name}</span>`;
					break;
				case 'svg':
					icon.innerHTML = o.icon.name; // Assuming o.icon.name is an SVG string
					break;
			}
			button.appendChild(icon);
			const span = create('span');
			span.classList.add('ms-2');
			span.textContent = o.name;
			button.appendChild(span);
			button.addEventListener('click', o.action);
			li.appendChild(button);
			list.appendChild(li);
		}
	}

	// const fn = (e: MouseEvent) => {
	for (const currentMenus of findAll('.contextmenu')) {
		currentMenus.remove();
	}

	document.body.appendChild(el);
	const pos = rightClickContextMenu(event, el, margin);
	el.style.left = `${pos.x}px`;
	el.style.top = `${pos.y}px`;
	el.style.zIndex = '9000';
	el.style.visibility = 'visible';

	const rm = () => {
		el.remove();
		document.removeEventListener('click', rm);
	};

	setTimeout(() => {
		document.addEventListener('click', rm);
	}, 10);

	return () => {
		rm();
	};
};
