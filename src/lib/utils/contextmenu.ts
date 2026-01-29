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

const rightClickContextMenu = (e: MouseEvent, el: HTMLDivElement) => {
	const browser = {
		h: window.innerHeight,
		w: window.innerWidth
	};

	const pos = {
		x: e.clientX,
		y: e.clientY
	};

	const { width, height } = el.getBoundingClientRect();

	return {
		x: pos.x + width > browser.w ? pos.x - width : pos.x,
		y: pos.y + height > browser.h ? pos.y - height : pos.y
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

	const el = create('div');
	el.style.width = width;
	el.classList.add('shadow', 'border-0', 'contextmenu', 'rounded', 'layer-3');
	el.style.position = 'fixed';
	el.style.zIndex = '1000';
	const body = create('div');
	body.classList.add('card-body', 'p-0', 'border-0', 'rounded');
	el.appendChild(body);
	const list = create('ul');
	list.classList.add('list-group', 'list-group-flush', 'border-0', 'p-0');
	body.appendChild(list);
	for (const o of options) {
		const li = create('li');
		li.classList.add('list-group-item', 'border-0', 'p-0', 'm-0');

		if (o === null) {
			const hr = create('hr');
			hr.classList.add('dropdown-divider', 'bg-secondary');
			hr.style.height = '1px';
			hr.style.width = '100%';
			list.appendChild(hr);
		} else if (typeof o === 'string') {
			const p = create('p');
			p.classList.add('text-muted', 'p-2', 'm-0', 'bg-dark');
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
				'rounded-0'
			);
			button.type = 'button';
			const icon = create('span');
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

	const pos = rightClickContextMenu(event, el);
	el.style.left = `${pos.x}px`;
	el.style.top = `${pos.y}px`;
	el.style.zIndex = '9000';
	document.body.appendChild(el);

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
