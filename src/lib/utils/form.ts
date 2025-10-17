import Modal from '../components/bootstrap/Modal.svelte';
import { createRawSnippet, mount } from 'svelte';
import { modalTarget, createButtons, clearModals } from './prompts';
import { attemptAsync } from 'ts-utils/check';

type Option =
	| string
	| {
			value: string;
			label: string;
			disabled?: boolean;
	  };

/**
 * Validation rule for form inputs
 */
type ValidationRule = {
	type: 'required' | 'email' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern';
	value?: string | number | RegExp;
	message: string;
};

/**
 * Field error information
 */
type FieldError = {
	field: string;
	message: string;
};

type Inputs = {
	password: {
		length: number;
	};
	text: {
		length: number;
		datalist?: (value: string) => string[] | Promise<string[]>;
	};
	number: {
		min: number;
		max: number;
		step: number;
	};
	textarea: {
		rows: number;
	};
	email: void;
	checkbox: Option[];
	radio: Option[];
	select: Option[];
	file: {
		multiple: boolean;
		accept: string;
	};
	color: void;
	date: void;
	'datetime-local': void;
};

type ReturnTypes = {
	text: string;
	color: string;
	number: number;
	textarea: string;
	email: string;
	checkbox: string[];
	radio: string;
	select: string;
	password: string;
	file: FileList;
	date: string;
	'datetime-local': string;
};

type InputReturnType<T extends keyof Inputs> = ReturnTypes[T];

type Input<T extends keyof Inputs> = {
	type: T;
	label: string;
	placeholder?: string;
	required: boolean;
	options?: Partial<Inputs[T]>;
	value?: string;
	disabled?: boolean;
	validation?: ValidationRule[];
	helpText?: string;
};

/**
 * Type-safe form builder with validation, accessibility, and state management
 *
 * @example Basic usage
 * ```typescript
 * const form = new Form()
 *   .input('name', {
 *     type: 'text',
 *     label: 'Full Name',
 *     required: true,
 *     validation: [
 *       { type: 'required', message: 'Name is required' },
 *       { type: 'minLength', value: 2, message: 'Name must be at least 2 characters' }
 *     ]
 *   })
 *   .input('email', {
 *     type: 'email',
 *     label: 'Email Address',
 *     required: true,
 *     validation: [
 *       { type: 'required', message: 'Email is required' },
 *       { type: 'email', message: 'Invalid email format' }
 *     ]
 *   });
 *
 * // Render as modal prompt
 * const result = await form.prompt({ title: 'Contact Information', send: false });
 * console.log(result.value); // { name: string, email: string }
 * ```
 *
 * @example Custom validation
 * ```typescript
 * const form = new Form()
 *   .input('password', {
 *     type: 'password',
 *     label: 'Password',
 *     validation: [
 *       { type: 'minLength', value: 8, message: 'Password must be at least 8 characters' },
 *       { type: 'pattern', value: /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: 'Password must contain uppercase, lowercase, and number' }
 *     ]
 *   });
 * ```
 *
 * Features:
 * - Type-safe input definitions and return values
 * - Built-in validation with custom rules
 * - ARIA accessibility attributes
 * - Form state management (dirty/pristine tracking)
 * - Bootstrap styling integration
 * - Modal integration for prompts
 * - Memory leak prevention with proper cleanup
 */
export class Form<T extends { [key: string]: Input<keyof Inputs> }> {
	private eventListeners: { element: HTMLElement; type: string; listener: EventListener }[] = [];
	private _rendered: HTMLFormElement | undefined;
	private _initialValues: Record<string, string | string[]> = {};
	private _currentValues: Record<string, string | string[]> = {};
	private _errors: FieldError[] = [];
	private _isDirty = false;

	/**
	 * Create a new form builder
	 * @param action - Form action URL for submission
	 * @param method - HTTP method for form submission
	 * @param inputs - Initial input definitions (typically empty for new forms)
	 */
	constructor(
		public readonly action?: string,
		public readonly method?: 'POST' | 'GET',
		public readonly inputs: T = {} as T
	) {
		this._initializeValues();
	}

	/**
	 * Initialize form values for dirty state tracking
	 */
	private _initializeValues() {
		for (const [name, input] of Object.entries(this.inputs)) {
			this._initialValues[name] = input.value || '';
			this._currentValues[name] = input.value || '';
		}
	}

	/**
	 * Validate a single field based on its validation rules
	 */
	private _validateField(name: string, value: string | string[]): string[] {
		const input = this.inputs[name];
		if (!input?.validation) return [];

		const errors: string[] = [];
		for (const rule of input.validation) {
			switch (rule.type) {
				case 'required':
					if (!value || (Array.isArray(value) && value.length === 0)) {
						errors.push(rule.message);
					}
					break;
				case 'email':
					if (typeof value === 'string' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
						errors.push(rule.message);
					}
					break;
				case 'minLength':
					if (
						typeof value === 'string' &&
						typeof rule.value === 'number' &&
						value.length < rule.value
					) {
						errors.push(rule.message);
					}
					break;
				case 'maxLength':
					if (
						typeof value === 'string' &&
						typeof rule.value === 'number' &&
						value.length > rule.value
					) {
						errors.push(rule.message);
					}
					break;
				case 'min':
					if (
						typeof value === 'string' &&
						typeof rule.value === 'number' &&
						parseFloat(value) < rule.value
					) {
						errors.push(rule.message);
					}
					break;
				case 'max':
					if (
						typeof value === 'string' &&
						typeof rule.value === 'number' &&
						parseFloat(value) > rule.value
					) {
						errors.push(rule.message);
					}
					break;
				case 'pattern':
					if (typeof value === 'string' && value && rule.value) {
						const regex =
							rule.value instanceof RegExp
								? rule.value
								: typeof rule.value === 'string'
									? new RegExp(rule.value)
									: null;
						if (regex && !regex.test(value)) {
							errors.push(rule.message);
						}
					}
					break;
			}
		}
		return errors;
	}

	/**
	 * Add an input field to the form using fluent builder pattern
	 * @param name - Unique field name
	 * @param input - Input configuration with type, label, validation, etc.
	 * @returns New form instance with added input (immutable)
	 */
	input<Name extends string, I extends keyof Inputs>(
		name: Name,
		input: Input<I>
	): Form<T & { [key in Name]: Input<I> }> {
		return new Form(this.action, this.method, {
			...this.inputs,
			[name]: input
		});
	}

	/**
	 * Render the form as an HTMLFormElement
	 * @param config - Rendering options
	 * @param config.addListeners - Whether to add change event listeners
	 * @param config.submit - Whether to include a submit button
	 * @param config.cached - Whether to return cached form element if available
	 * @returns HTMLFormElement with all inputs and styling
	 */
	render(
		config?: Partial<{
			addListeners: boolean;
			submit: boolean;
			cached?: boolean;
		}>
	): HTMLFormElement {
		if (config?.cached && this._rendered) {
			return this._rendered;
		}
		const form = document.createElement('form');
		const id = Math.random().toString(36).substring(7);
		form.id = id;
		form.action = this.action || '';
		form.method = this.method || '';

		for (const [name, input] of Object.entries(this.inputs)) {
			const wrapper = document.createElement('div');
			wrapper.classList.add('mb-3');

			const label = document.createElement('label');
			label.innerText = input.label;
			label.htmlFor = id + '-' + name;
			label.classList.add('form-label');

			// Add required indicator for accessibility
			if (input.required) {
				const requiredSpan = document.createElement('span');
				requiredSpan.innerText = ' *';
				requiredSpan.classList.add('text-danger');
				requiredSpan.setAttribute('aria-label', 'required');
				label.appendChild(requiredSpan);
			}

			let el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

			switch (input.type) {
				case 'text':
				case 'number':
				case 'password':
				case 'email':
				case 'color':
				case 'date':
				case 'datetime-local':
					el = document.createElement('input');
					el.type = input.type;
					if (input.value != undefined) el.setAttribute('value', input.value);

					if (input.options) {
						const o = input.options as Inputs['text'];
						if (o.length) el.maxLength = o.length;
						if (o.datalist) {
							const datalist = document.createElement('datalist');
							datalist.id = id + '-' + name + '-datalist';
							el.setAttribute('list', datalist.id);
							const updateDatalist = async () => {
								try {
									if (!o.datalist) return;
									const options = await o.datalist(el.value);
									datalist.innerHTML = '';
									for (const option of options) {
										const opt = document.createElement('option');
										opt.value = option;
										datalist.appendChild(opt);
									}
								} catch (error) {
									console.error(error);
								}
							};
							el.addEventListener('input', updateDatalist);
							this.eventListeners.push({ element: el, type: 'input', listener: updateDatalist });
							wrapper.appendChild(datalist);
						}
					}

					break;
				case 'textarea':
					el = document.createElement('textarea');
					el.rows = (input.options as Inputs['textarea'])?.rows || 3;
					if (input.value != undefined) el.setAttribute('value', input.value);
					break;
				case 'checkbox':
				case 'radio':
					wrapper.classList.add('form-check');
					for (const option of input.options as Option[]) {
						const checkWrapper = document.createElement('div');
						checkWrapper.classList.add('form-check');

						const checkInput = document.createElement('input');
						checkInput.type = input.type;
						checkInput.name = name;
						checkInput.checked =
							input.value === (typeof option === 'string' ? option : option.value);
						checkInput.value = typeof option === 'string' ? option : option.value;
						checkInput.classList.add('form-check-input');

						const checkLabel = document.createElement('label');
						checkLabel.innerText = typeof option === 'string' ? option : option.label;
						checkLabel.classList.add('form-check-label');

						checkWrapper.appendChild(checkInput);
						checkWrapper.appendChild(checkLabel);
						wrapper.appendChild(checkWrapper);
					}
					form.appendChild(wrapper);
					continue;
				case 'select':
					el = document.createElement('select');
					for (const option of input.options as Option[]) {
						const opt = document.createElement('option');
						opt.value = typeof option === 'string' ? option : option.value;
						opt.innerText = typeof option === 'string' ? option : option.label;
						if (typeof option !== 'string' && option.disabled) {
							opt.disabled = true;
						}
						if (input.value != undefined) el.setAttribute('value', input.value);
						el.appendChild(opt);
					}
					break;
				case 'file':
					el = document.createElement('input');
					el.type = 'file';
					el.multiple = (input.options as Inputs['file']).multiple;
					el.accept = (input.options as Inputs['file']).accept;
					break;
				default:
					throw new Error(`Unsupported input type: ${input.type}`);
			}

			el.name = name;
			el.id = id + '-' + name;
			el.classList.add('form-control', `input-${id}`);

			// Add ARIA attributes for accessibility
			if (input.helpText) {
				el.setAttribute('aria-describedby', `${el.id}-help`);
			}
			if (input.required) {
				el.setAttribute('aria-required', 'true');
			}

			if (input.placeholder) {
				if (el instanceof HTMLSelectElement) {
					const placeholderOption = document.createElement('option');
					placeholderOption.value = '';
					placeholderOption.disabled = true;
					placeholderOption.selected = true;
					placeholderOption.innerText = input.placeholder;
					el.appendChild(placeholderOption);
				} else {
					el.placeholder = input.placeholder;
				}
			}

			if (input.required) {
				el.required = true;
			}

			if (config?.addListeners) {
				const onChange = (e: Event) => {
					const target = e.target as HTMLInputElement;

					// Update current values for dirty state tracking
					this._currentValues[name] = target.value;
					this._checkDirtyState();

					// Clear field errors on change
					this._errors = this._errors.filter((err) => err.field !== name);
					target.classList.remove('is-invalid');
					target.removeAttribute('aria-invalid');

					const errorContainer = this._rendered?.querySelector(
						`#${target.id}-error`
					) as HTMLElement;
					if (errorContainer) {
						errorContainer.style.display = 'none';
					}
				};

				el.addEventListener('change', onChange);
				this.eventListeners.push({ element: el, type: 'change', listener: onChange });
			}

			if (input.disabled) {
				el.disabled = true;
			}

			wrapper.appendChild(label);
			wrapper.appendChild(el);

			// Add help text if provided
			if (input.helpText) {
				const helpText = document.createElement('div');
				helpText.id = `${el.id}-help`;
				helpText.classList.add('form-text');
				helpText.innerText = input.helpText;
				wrapper.appendChild(helpText);
			}

			// Add error container for validation feedback
			const errorContainer = document.createElement('div');
			errorContainer.id = `${el.id}-error`;
			errorContainer.classList.add('invalid-feedback');
			errorContainer.style.display = 'none';
			wrapper.appendChild(errorContainer);

			form.appendChild(wrapper);
		}

		if (config?.submit) {
			const submit = document.createElement('button');
			submit.type = 'submit';
			submit.innerText = 'Submit';
			submit.classList.add('btn', 'btn-primary');
			form.appendChild(submit);
		}

		this._rendered = form;

		return form;
	}

	/**
	 * Clean up event listeners to prevent memory leaks
	 * Call this when the form is no longer needed
	 */
	destroy() {
		this.eventListeners.forEach(({ element, type, listener }) => {
			element.removeEventListener(type, listener);
		});
		this.eventListeners = [];
	}

	/**
	 * Check if the form has unsaved changes
	 */
	isDirty(): boolean {
		return this._isDirty;
	}

	/**
	 * Reset form to initial values
	 */
	reset(): void {
		this._currentValues = { ...this._initialValues };
		this._isDirty = false;
		this._errors = [];

		// Reset DOM elements if form is rendered
		if (this._rendered) {
			for (const [name] of Object.entries(this.inputs)) {
				const elements = this._rendered.querySelectorAll(`[name="${name}"]`);
				const initialValue = this._initialValues[name];

				elements.forEach((el) => {
					const inputEl = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
					if (
						inputEl instanceof HTMLInputElement &&
						(inputEl.type === 'checkbox' || inputEl.type === 'radio')
					) {
						inputEl.checked = Array.isArray(initialValue)
							? initialValue.includes(inputEl.value)
							: inputEl.value === initialValue;
					} else {
						inputEl.value = typeof initialValue === 'string' ? initialValue : '';
					}
					inputEl.classList.remove('is-invalid');
				});
			}
		}
	}

	/**
	 * Set form values programmatically
	 */
	setValues(values: Partial<Record<keyof T, string | string[]>>): void {
		for (const [name, value] of Object.entries(values)) {
			if (this.inputs[name]) {
				this._currentValues[name] = value as string | string[];
				this._checkDirtyState();

				// Update DOM elements if form is rendered
				if (this._rendered) {
					const elements = this._rendered.querySelectorAll(`[name="${name}"]`);
					elements.forEach((el) => {
						const inputEl = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
						if (
							inputEl instanceof HTMLInputElement &&
							(inputEl.type === 'checkbox' || inputEl.type === 'radio')
						) {
							inputEl.checked = Array.isArray(value)
								? value.includes(inputEl.value)
								: inputEl.value === value;
						} else {
							inputEl.value = typeof value === 'string' ? value : '';
						}
					});
				}
			}
		}
	}

	/**
	 * Check if form values have changed from initial state
	 */
	private _checkDirtyState(): void {
		const currentJson = JSON.stringify(this._currentValues);
		const initialJson = JSON.stringify(this._initialValues);
		this._isDirty = currentJson !== initialJson;
	}

	/**
	 * Show validation error for a specific field
	 */
	showFieldError(fieldName: string, message: string): void {
		// Remove existing error for this field
		this._errors = this._errors.filter((e) => e.field !== fieldName);
		// Add new error
		this._errors.push({ field: fieldName, message });

		if (this._rendered) {
			const fieldElement = this._rendered.querySelector(`[name="${fieldName}"]`) as HTMLElement;
			const errorContainer = this._rendered.querySelector(
				`#${fieldElement?.id}-error`
			) as HTMLElement;

			if (fieldElement && errorContainer) {
				fieldElement.classList.add('is-invalid');
				fieldElement.setAttribute('aria-invalid', 'true');
				errorContainer.innerText = message;
				errorContainer.style.display = 'block';
			}
		}
	}

	/**
	 * Clear all validation errors
	 */
	clearErrors(): void {
		this._errors = [];

		if (this._rendered) {
			// Remove error styling from all fields
			this._rendered.querySelectorAll('.is-invalid').forEach((el) => {
				el.classList.remove('is-invalid');
				el.removeAttribute('aria-invalid');
			});

			// Hide all error containers
			this._rendered.querySelectorAll('.invalid-feedback').forEach((container) => {
				(container as HTMLElement).style.display = 'none';
				(container as HTMLElement).innerText = '';
			});
		}
	}

	/**
	 * Validate all fields and show errors
	 */
	validate(): boolean {
		this.clearErrors();
		const values = this.value();
		let isValid = true;

		for (const [name, value] of Object.entries(values)) {
			const errors = this._validateField(name, value);
			if (errors.length > 0) {
				this.showFieldError(name, errors[0]);
				isValid = false;
			}
		}

		return isValid;
	}

	/**
	 * Get current validation errors
	 */
	getErrors(): FieldError[] {
		return [...this._errors];
	}

	/**
	 * Extract current form values with proper typing
	 * @returns Object with field names as keys and typed values
	 */
	value(): {
		[key in keyof T]: InputReturnType<T[key]['type']>;
	} {
		const values: Record<string, string | string[]> = {};

		for (const [name, input] of Object.entries(this.inputs)) {
			const elements = document.querySelectorAll(`[name="${name}"]`);

			if (input.type === 'checkbox' || input.type === 'radio') {
				const selectedValues: string[] = [];
				elements.forEach((el) => {
					const inputEl = el as HTMLInputElement;
					if (inputEl.checked) {
						selectedValues.push(inputEl.value);
					}
				});
				values[name] = selectedValues;
			} else {
				const inputEl = elements[0] as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
				values[name] = inputEl.value;
			}
		}

		return values as {
			[key in keyof T]: InputReturnType<T[key]['type']>;
		};
	}

	/**
	 * Submit the form programmatically
	 * Uses the configured action and method
	 */
	submit() {
		const form = this.render({
			addListeners: false,
			cached: true
		});
		// form.style.display = 'none';
		// document.body.appendChild(form);
		form.submit();
		// document.body.removeChild(form);
	}

	/**
	 * Display the form in a modal dialog
	 * @param config - Modal configuration
	 * @param config.title - Modal title text
	 * @param config.send - Whether to submit to server (true) or return values (false)
	 * @returns Promise resolving to form values and HTMLFormElement
	 */
	prompt(config: { title: string; send: boolean }) {
		const self = this;
		return attemptAsync(async () => {
			clearModals();
			let form: HTMLFormElement;
			let sent = false;
			return new Promise<{
				value: { [key in keyof T]: InputReturnType<T[key]['type']> };
				form: HTMLFormElement;
			}>((res, rej) => {
				if (!modalTarget) return rej('Modal target not found, likely not in the DOM environment');
				const modal = mount(Modal, {
					target: modalTarget,
					props: {
						title: config.title,
						body: createRawSnippet(() => ({
							render() {
								const div = document.createElement('div');
								div.appendChild(
									self.render({
										addListeners: true,
										submit: false
									})
								);
								return div.innerHTML;
							},
							setup(formEl: Element) {
								if (!(formEl instanceof HTMLFormElement))
									return console.error(
										'Element is not a form, there may be an issue with the setup and some things may not work as intended'
									);
								const id = formEl.id;
								if (!id)
									return console.error(
										'Form does not have an ID, there may be an issue with the setup and some things may not work as intended'
									);
								formEl.querySelectorAll(`.input-${id}`).forEach((i) => {
									const onchange = (e: Event) => {
										const input = e.target as HTMLInputElement;
										const fieldName = input.name;

										// Update current values for dirty state tracking
										self._currentValues[fieldName] = input.value;
										self._checkDirtyState();

										// Clear field errors on change
										self._errors = self._errors.filter((err) => err.field !== fieldName);
										input.classList.remove('is-invalid');
										input.removeAttribute('aria-invalid');

										const errorContainer = formEl.querySelector(
											`#${input.id}-error`
										) as HTMLElement;
										if (errorContainer) {
											errorContainer.style.display = 'none';
										}
									};

									// (el.querySelector(`.input-${id}`) as HTMLInputElement | undefined)?.focus();

									i.addEventListener('change', onchange);
									self.eventListeners.push({
										element: i as HTMLElement,
										type: 'change',
										listener: onchange
									});
								});

								const submit = (e: Event) => {
									// console.log('Sumbitted');
									if (config.send) {
										if (sent) return;
										sent = true;
										// console.log('sending...', self.action);
										// send the form to the server
										fetch(self.action || '', {
											method: self.method || 'POST',
											body: new FormData(formEl)
										});
										return;
									}
									e.preventDefault();
									res({
										value: self.value(),
										form
									});
									modal.hide();
								};

								// console.log('Adding submit listener');

								formEl.addEventListener('submit', submit);
								self.eventListeners.push({ element: formEl, type: 'submit', listener: submit });
								form = formEl;
								return () => self.destroy();
							}
						})),
						buttons: createButtons([
							{
								text: 'Submit',
								color: 'primary',
								onClick: () => {
									if (config.send) {
										form?.submit();
									}
									res({
										value: self.value(),
										form
									});
									modal.hide();
								}
							},
							{
								text: 'Cancel',
								color: 'secondary',
								onClick: () => {
									rej('cancel');
									modal.hide();
								}
							}
						])
					}
				});

				modal.show();
				modal.once('hide', () => {
					self.destroy();
					rej('cancel');
					clearModals();
				});
			});
		});
	}
}
