/**
 * @fileoverview Theme store helpers for light/dark mode.
 *
 * @example
 * import { setTheme, theme } from '$lib/utils/theme';
 * setTheme('dark');
 */
import { browser } from '$app/environment';
import { writable } from 'svelte/store';

/**
 * Writable theme store.
 */
export const theme = writable<'light' | 'dark'>('light');

/**
 * Updates the theme and persists it to localStorage.
 *
 * @param {'light'|'dark'} documentTheme - Theme name.
 */
export const setTheme = (documentTheme: 'light' | 'dark') => {
	theme.set(documentTheme);
	if (browser) {
		document.body.setAttribute('data-bs-theme', documentTheme);
		localStorage.setItem('theme', documentTheme);
	}
};

if (browser) {
	const savedTheme = localStorage.getItem('theme');
	if (savedTheme === 'light' || savedTheme === 'dark') {
		setTheme(savedTheme);
	} else {
		const prefersDark =
			window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
		setTheme(prefersDark ? 'dark' : 'light');
	}
}
