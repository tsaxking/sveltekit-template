import { repeatPrompt } from '../cli/utils';
import fs from 'fs/promises';
import { isIP } from 'net';
import path from 'path';

const isAddress = (d: string) => /^[a-zA-Z0-9.-]+$/.test(d) && !/\s/.test(d);

const replace = (text: string, replacements: Record<string, string>) => {
	let str = text;
	const matches = text.match(/{{\s*([a-zA-Z0-9_]+)\s*}}/g);
	if (matches) {
		for (const match of matches) {
			const key = match.replace(/{{\s*|\s*}}/g, '');
			if (replacements[key] !== undefined) {
				str = str.replace(match, replacements[key]);
			}
		}
	}
	return str;
};

const nginx = async () => {
	console.log('Configuring Nginx...');

	const rawConfig = {
		domain: [process.env.PUBLIC_DOMAIN || 'example.com', (d: string) => isAddress(d)],
		localIp: ['localhost', (d: string) => d === 'localhost' || isIP(d) !== 0],
		port: [process.env.PORT || '3000', (p: string) => /^\d+$/.test(p)],
		timeout: ['60s', (t: string) => /^\d+s$/.test(t)],
		bufferSize: ['512k', (b: string) => /^\d+k$/.test(b)],
		halfBufferSize: ['256k', (b: string) => /^\d+k$/.test(b)]
	} as const;

	const finalConfig: Record<string, string> = {};

	for (const [key, [defaultValue, validate]] of Object.entries(rawConfig)) {
		const value = await repeatPrompt({
			allowBlank: true,
			validate,
			message: `Enter value for ${key} (default: ${defaultValue})`
		}).unwrap();
		finalConfig[key] = value || defaultValue;
	}

	const template = await fs.readFile(path.join(process.cwd(), 'config', 'nginx.conf'), 'utf-8');
	const output = replace(template, finalConfig);

	await fs.writeFile(path.join(process.cwd(), 'dist', `${rawConfig.domain[0]}.conf`), output);
};

export default async () => {
	await fs.mkdir(path.join(process.cwd(), 'dist'), { recursive: true });
	await nginx();
};
