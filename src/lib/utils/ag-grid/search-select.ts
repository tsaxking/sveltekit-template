/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ICellEditorComp, ICellEditorParams } from 'ag-grid-community';

export type SearchSelectCellEditorParams = ICellEditorParams & {
	values?: any[];
	value?: any;
	defaultValue?: string;
};

export class SearchSelectCellEditor implements ICellEditorComp {
	private eInput!: HTMLInputElement;
	private eList!: HTMLUListElement;
	private params!: SearchSelectCellEditorParams;
	private filteredValues: any[] = [];
	private value: any;
	private highlightIndex = -1;

	init(params: SearchSelectCellEditorParams) {
		this.params = params;
		const validValues = (params.values ?? []).map((v) => v.toString());
		const initialValue = params.value?.toString() ?? '';
		const eventKey = params.eventKey;

		const shouldReplace =
			initialValue === params.defaultValue || validValues.includes(initialValue);

		const eGui = document.createElement('div');
		eGui.style.position = 'relative';

		this.eInput = document.createElement('input');
		this.eInput.type = 'text';
		this.eInput = document.createElement('input');
		this.eInput.type = 'text';
		this.eInput.style.width = '100%';
		this.eInput.style.boxSizing = 'border-box';
		this.eInput.style.border = 'none';
		this.eInput.style.outline = 'none';
		this.eInput.style.padding = '0 4px';
		this.eInput.style.font = 'inherit';

		// Match height to cell
		const cellRect = params.eGridCell?.getBoundingClientRect();
		if (cellRect) {
			this.eInput.style.height = `${cellRect.height}px`;
		}

		// Avoid setting twice
		let finalInitial = initialValue;
		if (eventKey && eventKey.length === 1) {
			finalInitial = shouldReplace ? eventKey : initialValue + eventKey;
		}

		this.eInput.value = finalInitial;
		this.value = finalInitial;

		eGui.appendChild(this.eInput);

		// Create dropdown
		this.eList = document.createElement('ul');
		this.eList.style.position = 'absolute';
		this.eList.style.top = '100%';
		this.eList.style.left = '0';
		this.eList.style.right = '0';
		this.eList.style.maxHeight = '150px';
		this.eList.style.overflowY = 'auto';
		this.eList.classList.add('bg-dark', 'text-white', 'shadow', 'rounded');
		// this.eList.style.border = '1px solid #ccc';
		this.eList.style.margin = '0';
		this.eList.style.padding = '0';
		this.eList.style.listStyle = 'none';
		eGui.appendChild(this.eList);

		this.filteredValues = params.values ?? [];
		this.filterList(this.eInput.value);

		this.eInput.addEventListener('input', () => {
			this.value = this.eInput.value;
			this.highlightIndex = -1;
			this.filterList(this.eInput.value);
		});

		this.eInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' || e.key === 'Tab') {
				if (this.highlightIndex >= 0 && this.filteredValues[this.highlightIndex]) {
					this.setValue(this.filteredValues[this.highlightIndex]);
				} else {
					this.value = this.eInput.value;
				}
				this.params.api.stopEditing(); // Save on tab or enter
				e.preventDefault(); // Prevent tab from jumping cell early
			} else if (e.key === 'Escape') {
				this.params.api.stopEditing(true); // Cancel edit
			} else if (e.key === 'ArrowDown') {
				e.preventDefault();
				this.highlightIndex = Math.min(this.highlightIndex + 1, this.filteredValues.length - 1);
				this.updateHighlight();
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				this.highlightIndex = Math.max(this.highlightIndex - 1, 0);
				this.updateHighlight();
			}
		});

		let isMouseSelecting = false;

		this.eList.addEventListener('mousedown', (e) => {
			isMouseSelecting = true;
			const target = e.target as HTMLElement;
			if (target && target.dataset['value']) {
				this.setValue(target.dataset['value']);
				this.params.api.stopEditing(); // Commit immediately
				e.preventDefault(); // Prevent input refocus
			}
		});

		// Delay blur handler to give time for mousedown to complete
		this.eInput.addEventListener('blur', () => {
			setTimeout(() => {
				if (!isMouseSelecting) {
					this.params.api.stopEditing(true); // Cancel edit
				}
				isMouseSelecting = false;
			}, 0);
		});

		setTimeout(() => {
			this.eInput.focus();

			if (this.params.defaultValue && this.eInput.value === this.params.defaultValue) {
				this.eInput.value = ''; // clear default to start fresh
				this.filterList('');
			} else {
				// otherwise select everything (normal behavior)
				this.eInput.setSelectionRange(0, this.eInput.value.length);
			}
		}, 0);
	}

	getGui() {
		return this.eInput.parentElement!;
	}

	afterGuiAttached() {
		this.eInput.focus();
	}

	getValue() {
		return this.value;
	}

	isPopup?() {
		return true;
	}

	setValue(newValue: string) {
		this.value = newValue;
		this.eInput.value = newValue;
	}

	filterList(filterText: string) {
		const lower = filterText.toLowerCase();
		this.filteredValues = (this.params.values ?? []).filter((v: any) =>
			v.toString().toLowerCase().includes(lower)
		);
		this.renderList();
	}

	updateHighlight() {
		const items = Array.from(this.eList.children);
		items.forEach((el, idx) => {
			(el as HTMLElement).style.background = idx === this.highlightIndex ? '#555' : '';
		});

		const current = items[this.highlightIndex] as HTMLElement;
		if (current) current.scrollIntoView({ block: 'nearest' });
	}

	renderList() {
		this.eList.innerHTML = '';
		for (const val of this.filteredValues) {
			const li = document.createElement('li');
			li.textContent = val.toString();
			li.dataset['value'] = val.toString();
			li.style.padding = '4px 8px';
			li.style.cursor = 'pointer';
			this.eList.appendChild(li);
		}
		this.updateHighlight();
	}

	destroy() {
		// Optional cleanup
	}
}
