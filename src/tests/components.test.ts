/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, fireEvent, cleanup } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRawSnippet, tick } from 'svelte';
import { writable } from 'svelte/store';
import ButtonGroup from '$lib/components/bootstrap/ButtonGroup.svelte';
import Card from '$lib/components/bootstrap/Card.svelte';
import DateInput from '$lib/components/forms/DateInput.svelte';
import FloatingInput from '$lib/components/forms/FloatingInput.svelte';
import Password from '$lib/components/forms/Password.svelte';
import Select from '$lib/components/forms/Select.svelte';
import Grid from '$lib/components/general/Grid.svelte';
import DashboardComponent from '$lib/components/dashboard/Dashboard.svelte';
import MinimizedCards from '$lib/components/dashboard/MinimizedCards.svelte';
import { Dashboard } from '$lib/model/dashboard';
import { sleep } from 'ts-utils';

vi.mock('ag-grid-community', () => {
	const gridApi = {
		setGridOption: vi.fn(),
		getRenderedNodes: vi.fn(() => []),
		forEachNode: vi.fn(),
		refreshCells: vi.fn(),
		refreshHeader: vi.fn(),
		destroy: vi.fn()
	};

	return {
		createGrid: vi.fn(() => gridApi),
		ModuleRegistry: { registerModules: vi.fn() },
		ClientSideRowModelModule: {},
		PaginationModule: {},
		ValidationModule: {},
		RowApiModule: {},
		QuickFilterModule: {},
		RowSelectionModule: {},
		RenderApiModule: {},
		EventApiModule: {},
		RowStyleModule: {},
		CellStyleModule: {},
		themeQuartz: { withParams: vi.fn((params) => ({ params })) }
	};
});

vi.mock('$lib/utils/ag-grid/checkbox-select', () => ({
	CheckBoxSelectRenderer: vi.fn(),
	HeaderCheckboxRenderer: vi.fn()
}));

afterEach(() => cleanup());

describe('ButtonGroup', () => {
	it('renders size, label, and vertical classes', () => {
		const buttons = createRawSnippet(() => ({
			render: () => '<div><button>One</button><button>Two</button></div>'
		}));

		const { container } = render(ButtonGroup, {
			props: {
				size: 'md',
				vertical: true,
				label: 'Actions',
				buttons
			}
		});

		const group = container.querySelector('.btn-group');
		expect(group).toBeTruthy();
		expect(group?.classList.contains('btn-group-md')).toBe(true);
		expect(group?.classList.contains('btn-group-vertical')).toBe(true);
		expect(group?.getAttribute('aria-label')).toBe('Actions');
	});
});

describe('Card', () => {
	it('toggles minimize/maximize and hide/show', async () => {
		const body = createRawSnippet(() => ({
			render: () => '<p data-testid="body">Body</p>'
		}));

		const { container, component, getByText } = render(Card, {
			props: {
				title: 'Stats',
				body,
				classes: 'custom'
			}
		});

		expect(getByText('Stats')).toBeTruthy();
		const card = container.querySelector('.card');
		const bodyEl = container.querySelector('.card-body');
		expect(card?.classList.contains('custom')).toBe(true);
		expect(bodyEl?.classList.contains('hide')).toBe(false);

		component.minimize();
		await tick();
		expect(bodyEl?.classList.contains('hide')).toBe(true);

		component.maximize();
		await tick();
		expect(bodyEl?.classList.contains('hide')).toBe(false);

		component.hide();
		await tick();
		expect(card?.classList.contains('hide')).toBe(true);

		component.show();
		await tick();
		expect(card?.classList.contains('hide')).toBe(false);
	});
});

describe('FloatingInput', () => {
	it('renders text input and triggers callbacks', async () => {
		const onInput = vi.fn();
		const onChange = vi.fn();
		const { container } = render(FloatingInput, {
			props: {
				type: 'text',
				label: 'Name',
				placeholder: 'Jane',
				value: '',
				onInput,
				onChange
			}
		});

		const input = container.querySelector('input');
		expect(input).toBeTruthy();
		await fireEvent.input(input as HTMLInputElement, { target: { value: 'Alice' } });
		await fireEvent.change(input as HTMLInputElement, { target: { value: 'Alice' } });

		expect(onInput).toHaveBeenCalledWith('Alice');
		expect(onChange).toHaveBeenCalledWith('Alice');
	});

	it('renders textarea input', async () => {
		const onInput = vi.fn();
		const { container } = render(FloatingInput, {
			props: {
				type: 'textarea',
				label: 'Notes',
				placeholder: 'Type...',
				value: '',
				onInput
			}
		});

		const textarea = container.querySelector('textarea');
		expect(textarea).toBeTruthy();
		await fireEvent.input(textarea as HTMLTextAreaElement, { target: { value: 'Hello' } });
		expect(onInput).toHaveBeenCalledWith('Hello');
	});

	it('renders select input with options', async () => {
		const onChange = vi.fn();
		const options = createRawSnippet(() => ({
			render: () =>
				'<optgroup label="Choices"><option value="a">A</option><option value="b">B</option></optgroup>'
		}));

		const { container } = render(FloatingInput, {
			props: {
				type: 'select',
				label: 'Choice',
				placeholder: 'Choose',
				value: 'a',
				onChange,
				options
			}
		});

		const select = container.querySelector('select');
		expect(select).toBeTruthy();
		await fireEvent.change(select as HTMLSelectElement, { target: { value: 'b' } });
		expect(onChange).toHaveBeenCalledWith('b');
	});
});

describe('DateInput', () => {
	it('converts change value to ISO string', async () => {
		const onChange = vi.fn();
		const { container } = render(DateInput, {
			props: {
				data: '',
				header: '',
				onChange
			}
		});

		const input = container.querySelector('input');
		const value = '2024-06-01T12:34';
		await fireEvent.change(input as HTMLInputElement, { target: { value } });
		expect(onChange).toHaveBeenCalledWith(new Date(value).toISOString());
	});
});

describe('Password', () => {
	it('toggles visibility and uses name as default id', async () => {
		const { container } = render(Password, {
			props: {
				name: 'password',
				placeholder: 'Password',
				label: 'Password'
			}
		});

		const input = container.querySelector('input');
		const button = container.querySelector('button');
		const icon = container.querySelector('i');

		expect(input?.getAttribute('type')).toBe('password');
		expect(input?.getAttribute('id')).toBe('password');
		expect(icon?.textContent?.trim()).toBe('visibility_off');

		await fireEvent.click(button as HTMLButtonElement);
		expect(input?.getAttribute('type')).toBe('text');
		expect(icon?.textContent?.trim()).toBe('visibility');
	});
});

describe('Select', () => {
	it('emits onChange with selected index and supports select()', async () => {
		const onChange = vi.fn();
		const { container, component } = render(Select, {
			props: {
				options: ['A', 'B'],
				default: 'Choose...',
				value: '',
				onChange
			}
		});

		const select = container.querySelector('select') as HTMLSelectElement;
		await fireEvent.change(select, { target: { value: 'B' } });
		expect(onChange).toHaveBeenCalledWith(1);

		component.select('A');
		await tick();
		expect(select.value).toBe('A');

		await fireEvent.change(select, { target: { value: '' } });
		expect(onChange).toHaveBeenCalledWith(-1);
	});
});

describe('Grid', () => {
	it('emits filter event when filtering input changes', async () => {
		const data = writable([{ id: 1 }, { id: 2 }]);
		const onFilter = vi.fn();

		const { container, component } = render(Grid, {
			props: {
				filter: true,
				height: 300,
				data,
				opts: {
					columnDefs: [{ field: 'id' }] as any
				}
			}
		});

		component.on('filter', onFilter);
		const input = container.querySelector('#filter-text-box');
		await fireEvent.input(input as HTMLInputElement, { target: { value: '2' } });

		await sleep(1000); // Wait for debounce
		expect(onFilter).toHaveBeenCalled();
	});

	it('getSelection returns selected nodes', async () => {
		const data = writable([{ id: 1 }, { id: 2 }]);
		const { component } = render(Grid, {
			props: {
				height: 200,
				data,
				opts: {
					columnDefs: [{ field: 'id' }] as any
				}
			}
		});

		const agGrid = (await import('ag-grid-community')) as any;
		const gridApi = agGrid.createGrid.mock.results[0]?.value;

		if (gridApi) {
			gridApi.forEachNode.mockImplementation((cb: (node: any) => void) => {
				cb({ checkboxSelected: true, data: { id: 99 } });
				cb({ checkboxSelected: false, data: { id: 100 } });
			});
		}

		expect(component.getSelection()).toEqual([{ id: 99 }]);
	});
});

describe('Dashboard components', () => {
	const createCard = (id: string) =>
		new Dashboard.Card({
			name: `card-${id}`,
			icon: { type: 'material-icons', name: 'home' },
			id,
			size: { width: 2, height: 1 }
		});

	it('Dashboard renders title and initializes', async () => {
		const card = createCard('one');
		const dashboard = new Dashboard.Dashboard({
			name: 'main',
			id: 'main',
			cards: [card]
		});
		const initSpy = vi.spyOn(dashboard, 'init');
		const body = createRawSnippet(() => ({ render: () => '<div>Body</div>' }));

		const { getByText } = render(DashboardComponent, {
			props: {
				dashboard,
				body: body as unknown as any
			}
		});
		await tick();

		expect(getByText('Main')).toBeTruthy();
		expect(initSpy).toHaveBeenCalled();
	});

	// it('Dashboard Card toggles maximize and hide', async () => {
	// 	const card = createCard('two');
	// 	const body = createRawSnippet(() => ({ render: () => '<div>Body</div>' }));

	// 	const { container } = render(DashboardCard, {
	// 		props: {
	// 			card,
	// 			body
	// 		}
	// 	});

	// 	const maximizeButton = container.querySelector('button[aria-label="Maximize"]');
	// 	await fireEvent.click(maximizeButton as HTMLButtonElement);
	// 	expect(card.data.maximized).toBe(true);

	// 	await fireEvent.click(maximizeButton as HTMLButtonElement);
	// 	expect(card.data.maximized).toBe(false);

	// 	const closeButton = container.querySelector('button[aria-label="Close"]');
	// 	await fireEvent.click(closeButton as HTMLButtonElement);
	// 	expect(card.data.show).toBe(false);
	// });

	it('MinimizedCards renders hidden cards and restores on click', async () => {
		const card = createCard('three');
		const dashboard = new Dashboard.Dashboard({
			name: 'main',
			id: 'main',
			cards: [card]
		});

		card.hide();

		const { container } = render(MinimizedCards, {
			props: {
				dashboard
			}
		});

		const button = container.querySelector('button');
		expect(button).toBeTruthy();
		await fireEvent.click(button as HTMLButtonElement);
		expect(card.data.show).toBe(true);
	});
});
