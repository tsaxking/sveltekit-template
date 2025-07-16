/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ICellRendererComp, ICellRendererParams } from 'ag-grid-community';

export class CheckBoxSelectRenderer<T> implements ICellRendererComp {
	private eGui!: HTMLElement;
	private input!: HTMLInputElement;
	private params!: ICellRendererParams<T>;

	init(params: ICellRendererParams<T>): void {
		this.params = params;

		this.eGui = document.createElement('label');
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

	getGui(): HTMLElement {
		return this.eGui;
	}

	refresh(params: ICellRendererParams<T>): boolean {
		this.input.checked = !!(params.node as any).checkboxSelected;
		return true;
	}

	destroy(): void {
		this.input.remove();
	}
}

export class HeaderCheckboxRenderer implements ICellRendererComp {
	private eGui!: HTMLElement;
	private input!: HTMLInputElement;
	private params!: ICellRendererParams;

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

	getGui(): HTMLElement {
		return this.eGui;
	}

	refresh(params: ICellRendererParams): boolean {
		this.params = params;
		this.updateState();
		return true;
	}

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

	destroy(): void {
		this.input.remove();
	}
}
