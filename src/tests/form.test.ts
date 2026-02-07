import { describe, expect, test, vi } from 'vitest';
import { Form } from '$lib/utils/form';

describe('Form utilities', () => {
	test('renders inputs and validates values', () => {
		const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.999999);
		const form = new Form()
			.input('email', {
				type: 'email',
				label: 'Email',
				required: true,
				validation: [
					{ type: 'required', message: 'Required' },
					{ type: 'email', message: 'Invalid email' }
				]
			})
			.input('name', {
				type: 'text',
				label: 'Name',
				required: true,
				placeholder: 'Jane',
				validation: [{ type: 'minLength', value: 2, message: 'Too short' }]
			});

		const el = form.render({ addListeners: true, submit: true });
		document.body.appendChild(el);

		const email = el.querySelector('input[name="email"]') as HTMLInputElement;
		const name = el.querySelector('input[name="name"]') as HTMLInputElement;
		expect(email).toBeTruthy();
		expect(name.placeholder).toBe('Jane');

		email.value = 'bad';
		name.value = 'J';
		email.dispatchEvent(new Event('change', { bubbles: true }));
		name.dispatchEvent(new Event('change', { bubbles: true }));

		expect(form.isDirty()).toBe(true);
		expect(form.validate()).toBe(false);
		expect(form.getErrors().length).toBeGreaterThan(0);

		email.value = 'jane@example.com';
		name.value = 'Jane';
		email.dispatchEvent(new Event('change', { bubbles: true }));
		name.dispatchEvent(new Event('change', { bubbles: true }));

		expect(form.validate()).toBe(true);
		expect(form.getErrors()).toEqual([]);
		randomSpy.mockRestore();
	});

	test('setValues, reset, and value() reflect DOM state', () => {
		const form = new Form()
			.input('color', {
				type: 'color',
				label: 'Color',
				required: false
			})
			.input('choice', {
				type: 'select',
				label: 'Choice',
				required: false,
				options: ['A', 'B']
			});

		const el = form.render({ addListeners: false });
		document.body.appendChild(el);

		form.setValues({ color: '#ff0000', choice: 'B' });
		const values = form.value();
		expect(values.color).toBe('#ff0000');
		expect(values.choice).toBe('B');
		expect(form.isDirty()).toBe(true);

		form.reset();
		const resetValues = form.value();
		expect(resetValues.color).toBe('#000000');
		expect(resetValues.choice).toBe('');
		expect(form.isDirty()).toBe(false);
	});
});
