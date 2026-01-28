/**
 * @fileoverview AG Grid date/time cell editor using flatpickr.
 *
 * @example
 * import { DateTimeCellEditor } from '$lib/utils/ag-grid/date-time';
 * const column = { cellEditor: DateTimeCellEditor };
 */
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
// import 'flatpickr/dist/themes/dark.css';
import '$lib/styles/flatpickr.css';

import type { ICellEditorComp, ICellEditorParams } from 'ag-grid-community';

/**
 * Flatpickr-based date/time editor for AG Grid.
 */
export class DateTimeCellEditor implements ICellEditorComp {
	/** Wrapper element used as the editor GUI. */
	private eWrapper!: HTMLDivElement;
	/** Input element bound to flatpickr. */
	private eInput!: HTMLInputElement;
	/** Flatpickr instance. */
	private picker!: flatpickr.Instance;
	/** Initial cell value. */
	private initialValue: string | null = null;
	/** Whether editing was canceled. */
	private cancel = false;
	/** Blur handler for outside clicks/focus. */
	private blurListener!: (e: MouseEvent | FocusEvent) => void;

	/**
	 * Initializes the editor and binds flatpickr.
	 *
	 * @param {ICellEditorParams} params - Editor params.
	 */
	init(params: ICellEditorParams): void {
		this.eWrapper = document.createElement('div');
		this.eWrapper.classList.add('ag-input-wrapper');

		this.eInput = document.createElement('input');
		this.eInput.classList.add('ag-input', 'ag-popup-editor', 'form-control');

		this.initialValue = params.value || '';

		this.picker = flatpickr(this.eInput, {
			enableTime: true,
			dateFormat: 'Y-m-d\\TH:i',
			defaultDate: this.initialValue || undefined,
			onReady: () => {
				this.eInput.focus();
			}
		});

		this.picker.calendarContainer.classList.add('flatpickr-custom-theme');

		const cellRect = params.eGridCell.getBoundingClientRect();
		this.eWrapper.style.position = 'fixed';
		this.eWrapper.style.left = `${cellRect.left}px`;
		this.eWrapper.style.top = `${cellRect.top}px`;
		this.eWrapper.style.width = `${cellRect.width}px`;
		this.eWrapper.style.height = `${cellRect.height}px`;
		this.eWrapper.style.zIndex = '9999';

		this.eInput.style.width = cellRect.width + 'px';
		this.eInput.style.height = cellRect.height + 'px';

		this.eInput.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') {
				this.cancel = true;
				this.picker.close();
			}
			if (e.key === 'Enter') {
				this.cancel = false;
				this.picker.close();
			}
		});

		// 🔥 This is the key part: close if you click or tab away
		this.blurListener = (e) => {
			const calendarEl = this.picker.calendarContainer;
			const clickedOutside =
				!this.eWrapper.contains(e.target as Node) && !calendarEl.contains(e.target as Node);

			if (clickedOutside) {
				this.picker.close();
				params.stopEditing(); // this closes the AG Grid editor
			}
		};

		document.addEventListener('mousedown', this.blurListener);
		document.addEventListener('focusin', this.blurListener);

		this.eWrapper.appendChild(this.eInput);
	}

	/**
	 * Returns the editor root element.
	 */
	getGui(): HTMLElement {
		return this.eWrapper;
	}

	/**
	 * Focuses the input after the GUI is attached.
	 */
	afterGuiAttached(): void {
		requestAnimationFrame(() => {
			this.eInput.focus();
			this.eInput.select();
		});
	}

	/**
	 * Returns the edited value as an ISO string.
	 */
	getValue(): string | null {
		if (this.cancel) return this.initialValue;
		const selectedDate = this.picker.selectedDates[0];
		return selectedDate ? selectedDate.toISOString() : null;
	}

	/**
	 * Indicates the editor should render as a popup.
	 */
	isPopup(): boolean {
		return true;
	}

	/**
	 * Indicates if the edit should be canceled.
	 */
	isCancelAfterEnd(): boolean {
		return this.cancel;
	}

	/**
	 * Cleans up flatpickr and event listeners.
	 */
	destroy(): void {
		if (this.picker) {
			this.picker.destroy();
		}
		document.removeEventListener('mousedown', this.blurListener);
		document.removeEventListener('focusin', this.blurListener);
	}
}
