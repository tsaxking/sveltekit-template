/**
 * Modal and notification system for user interactions
 *
 * Provides a comprehensive set of modal dialogs and notification utilities:
 * - Prompt dialogs with validation and keyboard support
 * - Selection modals with custom rendering
 * - Choice dialogs with keyboard shortcuts
 * - Confirmation dialogs with Enter/Escape handling
 * - Alert notifications with auto-hide
 * - Color picker modals
 * - Custom raw modals for complex content
 * - Toast-style notifications
 *
 * All modals support keyboard navigation (Enter to confirm, Escape to cancel)
 * and auto-focus on input elements for better UX.
 */
import { browser } from '$app/environment';
import { type BootstrapColor } from 'colors/color';
import Modal from '../components/bootstrap/Modal.svelte';
import { createRawSnippet, mount, unmount } from 'svelte';
import Alert from '$lib/components/bootstrap/Alert.svelte';
import { writable } from 'svelte/store';

/**
 * Global modal container element where all modal dialogs are rendered.
 * Created once and reused for all modal instances to ensure proper layering.
 */
export const modalTarget = (() => {
	if (browser) {
		const target = document.createElement('div');
		target.id = 'modal-target';
		document.body.appendChild(target);
		return target;
	}
	return null;
})();

/**
 * Clears all modal dialogs from the DOM.
 * Recursively removes modal elements and handles edge cases like text nodes.
 */
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

/** Configuration for modal button creation */
type ButtonConfig = {
	/** Text to display on the button */
	text: string;
	/** Bootstrap color theme for the button */
	color: BootstrapColor;
	/** Click handler function */
	onClick: () => void;
};

/**
 * Creates a single button with Bootstrap styling and click handler
 * @param config - Button configuration object
 * @returns Svelte snippet for the button
 */
const createButton = (config: ButtonConfig) => {
	//  onclick="${config.onClick}"
	return createRawSnippet(() => ({
		render: () => `<button class="btn btn-${config.color}">${config.text}</button>`,
		setup: (el) => {
			el.addEventListener('click', config.onClick);
		}
	}));
};

/**
 * Creates multiple buttons with Bootstrap styling and click handlers
 * @param buttons - Array of button configurations
 * @returns Svelte snippet containing all buttons
 */
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

/**
 * Creates a simple modal body with just a message paragraph
 * @param message - Text message to display
 * @returns Svelte snippet for the modal body
 */
const createModalBody = (message: string) =>
	createRawSnippet(() => ({
		render: () => `<p>${message}</p>`
	}));

/** Configuration options for prompt modals */
type PromptConfig = {
	/** Default value to pre-fill in the input */
	default?: string;
	/** Modal title (defaults to 'Prompt') */
	title?: string;
	/** Placeholder text for the input */
	placeholder?: string;
	/** Use textarea instead of input for multiline text */
	multiline?: boolean;
	/** Validation function that returns true if input is valid */
	validate?: (value: string) => boolean;
	/** HTML input type (text, password, number) */
	type?: 'text' | 'password' | 'number';
	/** Custom parser to transform the input value */
	parser?: (value: string) => string;
};

/**
 * Shows a prompt modal dialog for text input with validation and keyboard support
 *
 * Features:
 * - Auto-focus on input field
 * - Enter to submit (unless multiline mode)
 * - Escape to cancel
 * - Real-time validation with visual feedback
 * - Support for single-line and multiline input
 *
 * @param message - The prompt message to display
 * @param config - Optional configuration for the prompt
 * @returns Promise that resolves to the entered text or null if cancelled
 */
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

/** Configuration options for select modals */
type SelectConfig<T> = {
	/** Modal title (defaults to 'Select') */
	title?: string;
	/** Custom renderer function for option display */
	render?: (value: T) => string;
};

/**
 * Shows a selection modal with a dropdown of options
 *
 * Features:
 * - Auto-focus on select element
 * - Enter to confirm selection
 * - Escape to cancel
 * - Custom rendering for complex option types
 *
 * @param message - The selection prompt message
 * @param options - Array of options to choose from
 * @param config - Optional configuration for rendering and title
 * @returns Promise that resolves to the selected option or null if cancelled
 */
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

/** Configuration options for choice modals */
type ChooseConfig = {
	/** Modal title (defaults to 'Choose') */
	title?: string;
};

/**
 * Represents a choice option that can be either a simple value or an object with value and display text
 */
type ChooseOption<Value> =
	| {
			value: Value;
			text: string;
	  }
	| Value;

/**
 * Renders the display text for a choice option
 * @param option - The choice option to render
 * @param which - Fallback text ('A' or 'B') if no display text available
 * @returns Display text for the option
 */
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

/**
 * Extracts the actual value from a choice option
 * @param option - The choice option to extract value from
 * @returns The underlying value of the option
 */
const valueGetter = <Value>(option: ChooseOption<Value>): Value => {
	if (typeof option === 'object' && option !== null) {
		if (Object.keys(option).length === 2 && 'value' in option && 'text' in option) {
			return option.value;
		}
	}
	return option as Value;
};

/**
 * Shows a choice modal with two options
 *
 * Features:
 * - Keyboard shortcuts: 1/A/← for first option, 2/B/→ for second option
 * - Escape to cancel
 * - Support for simple values or {value, text} objects
 * - Custom button text rendering
 *
 * @param message - The choice prompt message
 * @param A - First option (can be value or {value, text} object)
 * @param B - Second option (can be value or {value, text} object)
 * @param config - Optional configuration for title
 * @returns Promise that resolves to the selected option value or null if cancelled
 */
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

/** Configuration options for confirmation modals */
type ConfirmConfig = {
	/** Modal title (defaults to 'Confirm') */
	title?: string;
	/** Text for the 'yes' button (defaults to 'Yes') */
	yes?: string;
	/** Text for the 'no' button (defaults to 'No') */
	no?: string;
};

/**
 * Shows a confirmation modal with Yes/No buttons
 *
 * Features:
 * - Enter key confirms (returns true)
 * - Escape key cancels (returns false)
 * - Custom button text
 * - Bootstrap styling (Yes=success, No=danger)
 *
 * @param message - The confirmation message to display
 * @param config - Optional configuration for title and button text
 * @returns Promise that resolves to true if confirmed, false if cancelled
 */
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

/** Configuration options for alert modals */
type AlertConfig = {
	/** Modal title (defaults to 'Alert') */
	title?: string;
};

/**
 * Shows an alert modal with a single OK button
 *
 * Features:
 * - Enter or Escape key dismisses the alert
 * - Simple informational display
 * - Bootstrap primary styling
 *
 * @param message - The alert message to display
 * @param config - Optional configuration for title
 * @returns Promise that resolves when the alert is dismissed
 */
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

/** Configuration options for color picker modals */
type ColorPickerConfig = {
	/** Modal title (defaults to 'Color Picker') */
	title?: string;
	/** Default color value in hex format */
	default?: string;
};

/**
 * Shows a color picker modal with HTML color input
 *
 * Features:
 * - HTML5 color input for native color selection
 * - Enter key confirms selection
 * - Escape key cancels
 * - Default color pre-selection
 *
 * @param message - The color selection prompt message
 * @param config - Optional configuration for title and default color
 * @returns Promise that resolves to the selected color hex value or null if cancelled
 */
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

/** Configuration options for toast notifications */
type NotificationConfig = {
	/** Notification title */
	title: string;
	/** Notification message content */
	message: string;
	/** Bootstrap background color theme */
	color: BootstrapColor;
	/** Auto-hide delay in milliseconds (0 = no auto-hide) */
	autoHide?: number;
	/** Bootstrap text color theme */
	textColor?: BootstrapColor;
};

/**
 * Svelte store for managing notification history
 * Contains an array of notification configuration objects
 */
export const history = writable<NotificationConfig[]>([]);

/**
 * Shows a toast-style notification that appears in the document body
 *
 * Features:
 * - Appears directly in document body (not in modal container)
 * - Auto-hide with configurable delay
 * - Bootstrap color theming
 * - Automatic cleanup when hidden
 * - Non-blocking (doesn't require user interaction)
 *
 * @param config - Notification configuration object
 * @returns Svelte component instance for programmatic control
 * @throws Error if called in non-browser environment
 */
export const notify = (config: NotificationConfig) => {
	if (!browser) throw new Error('Cannot show notification in non-browser environment');

	history.update((d) => {
		d.push(config);
		return d;
	});
	// const notif = createNotif();
	// if (!notif) return;
	const mounted = mount(Alert, {
		target: document.body,
		props: {
			title: config.title,
			message: config.message,
			color: config.color,
			autoHide: config.autoHide ?? 0,
			textColor: config.textColor,
			onHide: () => {
				unmount(mounted);
			}
		}
	});
	return mounted;
};

/**
 * Creates a custom modal with raw HTML content and custom mount logic
 *
 * Features:
 * - Custom content mounting via callback
 * - Configurable buttons
 * - Escape key handling for dismissal
 * - Full control over modal body content
 * - Automatic cleanup on hide
 *
 * @param title - Modal title text
 * @param buttons - Array of button configurations
 * @param onMount - Callback that receives the modal body element and should return a Svelte component
 * @returns Modal control object with show/hide methods and event handling
 * @throws Error if called in non-browser environment
 */
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

/**
 * Svelte store for managing notification state
 * Contains an array of notification IDs for tracking active notifications
 */
export const notifs = writable<number[]>([]);
