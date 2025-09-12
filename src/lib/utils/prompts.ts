import { browser } from '$app/environment';
import { type BootstrapColor } from 'colors/color';
import Modal from '../components/bootstrap/Modal.svelte';
import { createRawSnippet, mount } from 'svelte';
import Alert from '$lib/components/bootstrap/Alert.svelte';

export const modalTarget = (() => {
	if (browser) {
		const target = document.createElement('div');
		target.id = 'modal-target';
		document.body.appendChild(target);
		return target;
	}
	return null;
})();

export const clearModals = async () => {
	if (modalTarget) {
		const remove = () => {
			const modal = modalTarget.lastChild;
			if (modal) {
				modalTarget.removeChild(modal);
				modal.remove();
				if (modal instanceof Text) {
					// For some reason, the modal sometimes is a text node, so we remove it again
					remove();
				}
			}
		};

		remove();
	}
};

type ButtonConfig = {
	text: string;
	color: BootstrapColor;
	onClick: () => void;
};
const createButton = (config: ButtonConfig) => {
	//  onclick="${config.onClick}"
	return createRawSnippet(() => ({
		render: () => `<button class="btn btn-${config.color}">${config.text}</button>`,
		setup: (el) => {
			el.addEventListener('click', config.onClick);
		}
	}));
};

export const createButtons = (buttons: ButtonConfig[]) => {
	return createRawSnippet(() => ({
		render: () =>
			`<div>${buttons.map((button, i) => `<button data-id=${i} class="btn btn-${button.color}">${button.text}</button>`).join('')}</div>`,
		setup: (el) => {
			for (let i = 0; i < buttons.length; i++) {
				el.children[i]?.addEventListener('click', buttons[i].onClick);
			}
		}
	}));
};

const createModalBody = (message: string) =>
	createRawSnippet(() => ({
		render: () => `<p>${message}</p>`
	}));

type PromptConfig = {
	default?: string;
	title?: string;
	placeholder?: string;
	multiline?: boolean;
	validate?: (value: string) => boolean;
	type?: 'text' | 'password' | 'number';
	parser?: (value: string) => string;
};
export const prompt = async (message: string, config?: PromptConfig) => {
	return new Promise<string | null>((res, rej) => {
		if (!modalTarget) return rej('Cannot show prompt in non-browser environment');

		let value = '';
		let valid = true;
		let input: HTMLInputElement | HTMLTextAreaElement | null = null;

		const modal = mount(Modal, {
			target: modalTarget,
			props: {
				title: config?.title || 'Prompt',
				body: createRawSnippet(() => ({
					render: () => `
                        <div>
                            <p>${message}</p>
                            ${
															config?.multiline
																? `<textarea data-id="input" class="form-control" placeholder="${config?.placeholder || ''}"></textarea>`
																: `<input data-id="input" type="${config?.type || 'text'}" class="form-control" placeholder="${config?.placeholder || ''}">`
														}
                        </div>
                    `,
					setup: (el) => {
						input = el.querySelector('input') || el.querySelector('textarea');
						if (config?.default && input) {
							input.value = config.default;
							config.default = undefined;
						}

						if (input) {
							const oninput = () => {
								if (input) value = input.value;
								valid = !config?.validate || config.validate(value);
								input?.classList.toggle('is-invalid', !valid);
							};

							input.addEventListener('input', oninput);

							const onkeydown = (e: KeyboardEvent) => {
								if (e.key === 'Enter' && !e.shiftKey && !config?.multiline) {
									e.preventDefault();
									if (!valid) return;
									res(config?.parser ? config.parser(value.trim()) : value.trim());
									modal.hide();
								} else if (e.key === 'Escape') {
									e.preventDefault();
									modal.hide();
									res(null);
								}
							};

							document.addEventListener('keydown', onkeydown);
							return () => {
								input?.removeEventListener('input', oninput);
								document.removeEventListener('keydown', onkeydown);
							};
						}
					}
				})),
				buttons: createButtons([
					{
						text: 'Cancel',
						color: 'secondary',
						onClick: () => {
							modal.hide();
							res(null);
						}
					},
					{
						text: 'Ok',
						color: 'primary',
						onClick: () => {
							if (!valid) return;
							res(config?.parser ? config.parser(value.trim()) : value.trim());
							modal.hide();
						}
					}
				])
			}
		});

		const onshow = () => {
			input?.focus();
		};

		modal.on('show', onshow);

		modal.show();
		modal.once('hide', () => {
			res(null);
			clearModals();
			modal.off('show', onshow);
		});
	});
};

type SelectConfig<T> = {
	title?: string;
	render?: (value: T) => string;
};
export const select = async <T>(message: string, options: T[], config?: SelectConfig<T>) => {
	return new Promise<T | null>((res, rej) => {
		if (!modalTarget) return rej('Cannot show select in non-browser environment');

		let selected: T | null = null;
		let input: HTMLSelectElement | null = null;

		const modal = mount(Modal, {
			target: modalTarget,
			props: {
				title: config?.title || 'Select',
				body: createRawSnippet(() => ({
					render: () => `
                        <div>
                            <p>${message}</p>
                            <select class="form-select" data-id="select">
                                <option disabled selected>Select an option</option>
                                ${options.map((option, i) => {
																	return `<option value="${i}">${config?.render ? config.render(option) : option}</option>`;
																})}
                            </select>
                        </div>
                    `,
					setup: (el) => {
						input = el.querySelector('select');
						if (input) {
							const onchange = () => {
								const int = parseInt(input!.value);
								if (!isNaN(int)) selected = options[int];
							};

							input.addEventListener('change', onchange);
							return () => {
								input?.removeEventListener('change', onchange);
							};
						}
					}
				})),
				buttons: createButtons([
					{
						text: 'Cancel',
						color: 'secondary',
						onClick: () => {
							modal.hide();
							res(null);
						}
					},
					{
						text: 'Select',
						color: 'primary',
						onClick: () => {
							res(selected);
							modal.hide();
						}
					}
				])
			}
		});

		const onkeydown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				modal.hide();
				res(null);
			}
			if (e.key === 'Enter') {
				e.preventDefault();
				if (selected) {
					res(selected);
					modal.hide();
				}
			}
		};

		document.addEventListener('keydown', onkeydown);

		modal.on('show', () => {
			input?.focus();
		});

		modal.show();
		modal.once('hide', () => {
			res(null);
			clearModals();
			document.removeEventListener('keydown', onkeydown);
		});
	});
};

type ChooseConfig = {
	title?: string;
};

type ChooseOption<Value> =
	| {
			value: Value;
			text: string;
	  }
	| Value;

const renderer = (option: ChooseOption<unknown>, which: 'A' | 'B'): string => {
	if (typeof option === 'string') return option;
	if (typeof option === 'object' && option !== null) {
		if (
			Object.keys(option).length === 2 &&
			'value' in option &&
			'text' in option &&
			typeof option.text === 'string'
		) {
			return option.text;
		}
	}
	return which;
};

const valueGetter = <Value>(option: ChooseOption<Value>): Value => {
	if (typeof option === 'object' && option !== null) {
		if (Object.keys(option).length === 2 && 'value' in option && 'text' in option) {
			return option.value;
		}
	}
	return option as Value;
};

export const choose = async <A, B>(
	message: string,
	A: ChooseOption<A>,
	B: ChooseOption<B>,
	config?: ChooseConfig
) => {
	return new Promise<A | B | null>((res, rej) => {
		if (!modalTarget) return rej('Cannot show choose in non-browser environment');

		const modal = mount(Modal, {
			target: modalTarget,
			props: {
				title: config?.title || 'Choose',
				body: createModalBody(message),
				buttons: createButtons([
					{
						text: 'Cancel',
						color: 'secondary',
						onClick: () => {
							res(null);
							modal.hide();
						}
					},
					{
						text: renderer(A, 'A'),
						color: 'primary',
						onClick: () => {
							res(valueGetter(A));
							modal.hide();
						}
					},
					{
						text: renderer(B, 'B'),
						color: 'primary',
						onClick: () => {
							res(valueGetter(B));
							modal.hide();
						}
					}
				])
			}
		});
		modal.show();
		const onkeydown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				res(null);
				return modal.hide();
			}
			if (e.key === '1' || e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
				e.preventDefault();
				res(valueGetter(A));
				return modal.hide();
			}
			if (e.key === '2' || e.key === 'ArrowRight' || e.key === 'b' || e.key === 'B') {
				e.preventDefault();
				res(valueGetter(B));
				return modal.hide();
			}
		};

		document.addEventListener('keydown', onkeydown);

		modal.once('hide', () => {
			res(null);
			clearModals();
			document.removeEventListener('keydown', onkeydown);
		});
	});
};

type ConfirmConfig = {
	title?: string;
	yes?: string;
	no?: string;
};
export const confirm = async (message: string, config?: ConfirmConfig) => {
	return new Promise<boolean>((res, rej) => {
		if (!modalTarget) return rej('Cannot show confirm in non-browser environment');

		const modal = mount(Modal, {
			target: modalTarget,
			props: {
				title: config?.title || 'Confirm',
				body: createModalBody(message),
				buttons: createButtons([
					{
						text: config?.yes || 'Yes',
						color: 'success',
						onClick: () => {
							res(true);
							modal.hide();
						}
					},
					{
						text: config?.no || 'No',
						color: 'danger',
						onClick: () => {
							res(false);
							modal.hide();
						}
					}
				]),
				setup: () => {
					return () => {};
				}
			}
		});
		modal.show();
		const onkeydown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				res(false);
				return modal.hide();
			}
			if (e.key === 'Enter') {
				e.preventDefault();
				res(true);
				return modal.hide();
			}
		};

		document.addEventListener('keydown', onkeydown);
		modal.once('hide', () => {
			res(false);
			clearModals();
			document.removeEventListener('keydown', onkeydown);
		});
	});
};

type AlertConfig = {
	title?: string;
};
export const alert = async (message: string, config?: AlertConfig) => {
	return new Promise<void>((res, rej) => {
		if (!modalTarget) return rej('Cannot show alert in non-browser environment');

		const modal = mount(Modal, {
			target: modalTarget,
			props: {
				title: config?.title || 'Alert',
				body: createModalBody(message),
				buttons: createButton({
					text: 'Ok',
					color: 'primary',
					onClick: () => {
						modal.hide();
						res();
					}
				})
			}
		});
		modal.show();

		const onkeydown = (e: KeyboardEvent) => {
			if (e.key === 'Escape' || e.key === 'Enter') {
				e.preventDefault();
				res();
				return modal.hide();
			}
		};

		document.addEventListener('keydown', onkeydown);

		modal.once('hide', () => {
			res();
			clearModals();
			document.removeEventListener('keydown', onkeydown);
		});
	});
};

type ColorPickerConfig = {
	title?: string;
	default?: string;
};
export const colorPicker = async (message: string, config?: ColorPickerConfig) => {
	return new Promise<string | null>((res, rej) => {
		if (!modalTarget) return rej('Cannot show color picker in non-browser environment');

		let selected: string | null = null;
		let input: HTMLInputElement | null = null;

		const modal = mount(Modal, {
			target: modalTarget,
			props: {
				title: config?.title || 'Color Picker',
				body: createRawSnippet(() => ({
					render: () => `
                        <div>
                            <p>${message}</p>
                            <input type="color" class="form-control" data-id="color">
                        </div>
                    `,
					setup: (el) => {
						input = el.querySelector('input');
						if (input) {
							if (config?.default) {
								input.setAttribute('value', config.default);
								selected = config.default;
								config.default = undefined;
							}

							const oninput = () => {
								selected = input!.value;
							};

							input.addEventListener('input', oninput);

							return () => {
								input?.removeEventListener('input', oninput);
							};
						}
					}
				})),
				buttons: createButtons([
					{
						text: 'Cancel',
						color: 'secondary',
						onClick: () => {
							modal.hide();
							res(null);
						}
					},
					{
						text: 'Select',
						color: 'primary',
						onClick: () => {
							res(selected as string);
							modal.hide();
						}
					}
				])
			}
		});

		// modal.on('show', () => {
		// 	input?.focus();
		// });

		modal.show();

		const onkeydown = (e: KeyboardEvent) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				if (selected) {
					res(selected);
					modal.hide();
				}
			} else if (e.key === 'Escape') {
				e.preventDefault();
				modal.hide();
				res(null);
			}
		};
		document.addEventListener('keydown', onkeydown);

		modal.once('hide', () => {
			document.removeEventListener('keydown', onkeydown);
			res(null);
			clearModals();
		});
	});
};

const notificationContainer = (() => {
	if (browser) {
		const container = document.createElement('div');
		container.classList.add(
			'notification-container',
			'position-fixed',
			'top-0',
			'end-0',
			'd-flex',
			'justify-content-end',
			'flex-column'
		);
		container.style.zIndex = '0';
		document.body.appendChild(container);
		return container;
	}
	return null;
})();

type NotificationConfig = {
	title: string;
	message: string;
	color: BootstrapColor;
	autoHide?: number;
	textColor?: BootstrapColor;
};

const createNotif = () => {
	if (!browser) return;
	const notif = document.createElement('div');
	notif.classList.add('notification');
	// notif.style.width = '300px';
	// notif.style.maxWidth = '100% !important';
	if (notificationContainer) notificationContainer.appendChild(notif);
	return notif;
};

export const notify = (config: NotificationConfig) => {
	const notif = createNotif();
	if (!notif) return;
	return mount(Alert, {
		target: notif,
		props: {
			title: config.title,
			message: config.message,
			animate: true,
			color: config.color,
			autoHide: config.autoHide ?? 0,
			textColor: config.textColor,
			onHide: () => {
				notif.remove();
			}
		}
	});
};

export const rawModal = (
	title: string,
	buttons: ButtonConfig[],
	onMount: (body: HTMLDivElement) => ReturnType<typeof mount>
) => {
	if (!modalTarget) throw new Error('Cannot show modal in non-browser environment');
	const modal = mount(Modal, {
		target: modalTarget,
		props: {
			title,
			body: createRawSnippet(() => ({
				render: () => `<div class="body-content"></div>`
			})),
			buttons: createButtons(buttons)
		}
	});

	const body = modalTarget.querySelector('.body-content');
	if (!body) throw new Error('Modal body not found');

	onMount(body as HTMLDivElement);

	const onkeydown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			e.preventDefault();
			return modal.hide();
		}
	};

	document.addEventListener('keydown', onkeydown);
	modal.on('hide', () => {
		document.removeEventListener('keydown', onkeydown);
		clearModals();
	});

	return {
		modal,
		hide: () => modal.hide(),
		show: () => modal.show(),
		on: modal.on.bind(modal)
	};
};
