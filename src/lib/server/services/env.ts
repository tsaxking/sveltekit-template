// This file is in progress
// This is supposed to read environment variables and convert them to a type-safe object and also provide utility functions to parse environment variables.

export const bool = (value: string | undefined) => {
	if (!value) return false;
	return ['true', '1', 'y', 'yes', 'on', 'enable', 'enabled'].includes(value.toLowerCase());
};

export const number = (value: string | undefined) => {
	if (!value) return 0;
	const num = parseFloat(value);
	return isNaN(num) ? 0 : num;
};

export const env = {};

export const generateEnvType = () => {};
