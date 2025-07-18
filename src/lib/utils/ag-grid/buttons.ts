import type { ICellRendererComp, ICellRendererParams } from 'ag-grid-community';

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

export class ButtonCellRenderer implements ICellRendererComp {
	private eGui!: HTMLDivElement;
	private buttons: ButtonDef[] = [];
	private params!: ICellRendererParams;

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

	getGui(): HTMLElement {
		return this.eGui;
	}

	refresh(): boolean {
		return false;
	}

	destroy(): void {
		// optional cleanup
	}
}
