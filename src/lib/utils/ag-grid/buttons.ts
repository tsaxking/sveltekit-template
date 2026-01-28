/**
 * @fileoverview AG Grid button cell renderer utilities.
 *
 * @example
 * import { ButtonCellRenderer } from '$lib/utils/ag-grid/buttons';
 * const column = { cellRenderer: ButtonCellRenderer, cellRendererParams: { buttons: [{
 * 		label: 'Click Me',
 * 		onClick: (params) => { console.log('Button clicked!', params); },
 * 		className: 'btn-primary',
 * 		title: 'Click this button'
 * }] } };
 */
import type { ICellRendererComp, ICellRendererParams } from 'ag-grid-community';

/**
 * Button definition for a cell.
 *
 * @property {string} [label] - Text label for the button.
 * @property {string} [html] - Raw HTML for the button content.
 * @property {(params: ICellRendererParams) => void} onClick - Click handler.
 * @property {string} [className] - Optional CSS class.
 * @property {string} [title] - Optional tooltip text.
 */
type ButtonDef =
	| {
			label: string;
			onClick: (params: ICellRendererParams) => void;
			className?: string;
			title?: string;
	  }
	| {
			html: string;
			onClick: (params: ICellRendererParams) => void;
			className?: string;
			title?: string;
	  };

/**
 * AG Grid cell renderer that displays one or more buttons.
 */
export class ButtonCellRenderer implements ICellRendererComp {
	/** Root container element. */
	private eGui!: HTMLDivElement;
	/** Button definitions for the cell. */
	private buttons: ButtonDef[] = [];
	/** Cached cell renderer params. */
	private params!: ICellRendererParams;

	/**
	 * Initializes the renderer and builds button elements.
	 *
	 * @param {ICellRendererParams & { buttons?: ButtonDef[] }} params - Renderer params.
	 */
	init(params: ICellRendererParams & { buttons?: ButtonDef[] }) {
		this.params = params;
		this.buttons = params.buttons ?? [];

		this.eGui = document.createElement('div');
		this.eGui.style.display = 'flex';
		this.eGui.style.gap = '4px';
		this.eGui.style.height = '100%';

		for (const btn of this.buttons) {
			const button = document.createElement('button');
			if ('label' in btn) {
				button.innerText = btn.label;
			} else {
				button.innerHTML = btn.html;
			}
			button.className = btn.className ?? 'btn';
			button.title = btn.title ?? '';

			button.addEventListener('click', (e) => {
				e.stopPropagation(); // don't trigger row click/select
				btn.onClick(params);
			});

			this.eGui.appendChild(button);
		}
	}

	/**
	 * Returns the root element for the renderer.
	 */
	getGui(): HTMLElement {
		return this.eGui;
	}

	/**
	 * AG Grid refresh handler (no-op).
	 */
	refresh(): boolean {
		return false;
	}

	/**
	 * Cleanup hook (optional).
	 */
	destroy(): void {
		// optional cleanup
	}
}
