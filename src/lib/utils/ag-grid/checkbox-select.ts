/**
 * @fileoverview AG Grid checkbox cell and header renderers.
 *
 * @example
 * import { CheckBoxSelectRenderer, HeaderCheckboxRenderer } from '$lib/utils/ag-grid/checkbox-select';
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ICellRendererComp, ICellRendererParams } from 'ag-grid-community';

/**
 * Checkbox renderer for row selection.
 */
export class CheckBoxSelectRenderer<T> implements ICellRendererComp {
	/** Root element container. */
	private eGui!: HTMLElement;
	/** Checkbox input element. */
	private input!: HTMLInputElement;
	/** Cached renderer params. */
	private params!: ICellRendererParams<T>;

	/**
	 * Initializes the renderer for a row.
	 *
	 * @param {ICellRendererParams<T>} params - Renderer params.
	 */
	init(params: ICellRendererParams<T>): void {
		this.params = params;

		this.eGui = document.createElement('div');
		this.eGui.className = 'custom-checkbox-label';

		this.input = document.createElement('input');
		this.input.type = 'checkbox';
		this.input.className = 'custom-checkbox-input';

		// Initialize checkbox from node state or false
		this.input.checked = !!(params.node as any).checkboxSelected;

		this.input.setAttribute('aria-label', 'Select row checkbox');

		this.input.addEventListener('change', () => {
			const checked = this.input.checked;
			(this.params.node as any).checkboxSelected = checked;
			// Refresh header checkbox state when any checkbox changes
			this.params.api!.refreshHeader();
		});

		const box = document.createElement('span');
		box.className = 'custom-checkbox-box';

		this.eGui.appendChild(this.input);
		this.eGui.appendChild(box);
	}

	/**
	 * Returns the renderer root element.
	 */
	getGui(): HTMLElement {
		return this.eGui;
	}

	/**
	 * Refreshes checkbox state from node data.
	 *
	 * @param {ICellRendererParams<T>} params - Renderer params.
	 */
	refresh(params: ICellRendererParams<T>): boolean {
		this.input.checked = !!(params.node as any).checkboxSelected;
		return true;
	}

	/**
	 * Cleanup hook.
	 */
	destroy(): void {
		this.input.remove();
	}
}

/**
 * Header renderer that toggles all row checkboxes.
 */
export class HeaderCheckboxRenderer implements ICellRendererComp {
	/** Root element container. */
	private eGui!: HTMLElement;
	/** Checkbox input element. */
	private input!: HTMLInputElement;
	/** Cached renderer params. */
	private params!: ICellRendererParams;

	/**
	 * Initializes the header checkbox renderer.
	 *
	 * @param {ICellRendererParams} params - Renderer params.
	 */
	init(params: ICellRendererParams): void {
		this.params = params;

		this.eGui = document.createElement('label');
		this.eGui.className = 'custom-checkbox-label header-checkbox-label';

		this.input = document.createElement('input');
		this.input.type = 'checkbox';
		this.input.className = 'custom-checkbox-input';
		this.input.setAttribute('aria-label', 'Toggle all checkboxes');

		this.input.addEventListener('change', () => {
			const checked = this.input.checked;

			// Set all nodes' checkboxSelected state and refresh rows
			this.params.api.forEachNode((node) => {
				(node as any).checkboxSelected = checked;
			});

			this.params.api.refreshCells({
				columns: [String(this.params.column?.getColId())],
				force: true
			});

			this.updateState(); // update indeterminate if needed (usually none)
		});

		const box = document.createElement('span');
		box.className = 'custom-checkbox-box';

		this.eGui.appendChild(this.input);
		this.eGui.appendChild(box);

		// Listen for cell refresh to update header checkbox state
		this.params.api.addEventListener('cellValueChanged', (event) => {
			if (event.column.getColId() === this.params.column?.getColId()) {
				this.updateState();
			}
		});

		// Also update state on grid data changes
		this.params.api.addEventListener('modelUpdated', () => {
			this.updateState();
		});

		this.updateState();
	}

	/**
	 * Returns the renderer root element.
	 */
	getGui(): HTMLElement {
		return this.eGui;
	}

	/**
	 * Refreshes header checkbox state.
	 *
	 * @param {ICellRendererParams} params - Renderer params.
	 */
	refresh(params: ICellRendererParams): boolean {
		this.params = params;
		this.updateState();
		return true;
	}

	/**
	 * Computes checked/indeterminate state.
	 */
	private updateState() {
		const api = this.params.api;
		let checkedCount = 0;
		let totalCount = 0;

		api.forEachNode((node) => {
			totalCount++;
			if ((node as any).checkboxSelected) {
				checkedCount++;
			}
		});

		if (checkedCount === 0) {
			this.input.checked = false;
			this.input.indeterminate = false;
		} else if (checkedCount === totalCount) {
			this.input.checked = true;
			this.input.indeterminate = false;
		} else {
			this.input.checked = false;
			this.input.indeterminate = true;
		}
	}

	/**
	 * Cleanup hook.
	 */
	destroy(): void {
		this.input.remove();
	}
}
