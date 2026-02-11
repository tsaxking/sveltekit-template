import { attemptAsync } from 'ts-utils/check';
import fs from 'fs';
import path from 'path';
import z from 'zod';
import { Account } from '../structs/account';
import type { Icon } from '$lib/types/icons';
import { type Feature } from '../../types/features';

export const getCachedList = () => {
	return attemptAsync(async () => {
		const data = await fs.promises.readFile(
			path.resolve(process.cwd(), 'private', 'features.json')
		);

		return z.array(z.string()).parse(JSON.parse(data.toString()));
	});
};

export const saveListCache = (list: string[]) => {
	return attemptAsync(async () => {
		await fs.promises.writeFile(
			path.resolve(process.cwd(), 'private', 'features.json'),
			JSON.stringify(list)
		);
	});
};

export const makeFeatureNotifications = () => {
	return attemptAsync(async () => {
		const features = await getFeatureList().unwrap();
		const cached = await getCachedList().unwrapOr([]);
		const newFeatures = features.filter((f) => !cached.includes(f.id));

		await Promise.all(
			newFeatures.map((f) =>
				Account.globalNotification({
					title: `New Feature: ${f.name}`,
					message: f.description,
					severity: 'info',
					icon: f.icon,
					link: `/features/${f.id}`
				})
			)
		);

		await saveListCache(features.map((f) => f.id)).unwrap();
	});
};

export const getFeatureMetadata = (feature: string) => {
	return attemptAsync(async () => {
		return new Promise<Feature>((res, rej) => {
			if (!feature.endsWith('.md')) feature += '.md';
			const rs = fs.createReadStream(path.resolve(process.cwd(), 'static', 'features', feature));
			let on = false;
			const obj: Feature = {
				id: feature.replace('.md', ''),
				name: '',
				description: '',
				date: -1,
				icon: {
					type: 'material-icons',
					name: 'question_mark'
				},
				picture: undefined
			};
			rs.on('data', (chunk) => {
				const chunks = chunk.toString().split('\n');
				for (const str of chunks) {
					if (str === '---') {
						if (on) rs.close();
						else on = !on;
					} else {
						if (str.startsWith('name')) {
							obj.name = str.replace('name: ', '');
						}
						if (str.startsWith('description')) {
							obj.description = str.replace('description: ', '');
						}
						if (str.startsWith('date')) {
							obj.date = new Date(str.replace('date: ', '')).getTime();
						}
						if (str.startsWith('icon-type')) {
							obj.icon.type = str.replace('icon-type: ', '') as Icon['type'];
						}
						if (str.startsWith('icon-name')) {
							obj.icon.name = str.replace('icon-name: ', '');
						}
						if (str.startsWith('picture')) {
							obj.picture = str.replace('picture: ', '');
						}
					}
				}
			});
			rs.on('close', () => {
				res(obj);
			});
			rs.on('error', (e) => {
				rej(e);
			});
		});
	});
};

export const getFeatureList = () => {
	return attemptAsync(async () => {
		return fs.promises
			.readdir(path.resolve(process.cwd(), 'static', 'features'))
			.then((features) =>
				Promise.all(features.map((f) => getFeatureMetadata(path.basename(f)).unwrap()))
			);
	});
};

export const getFeature = (
	feature: string,
	config: {
		domain: string;
	}
) => {
	return attemptAsync(async () => {
		if (!feature.endsWith('.md')) feature += '.md';
		let res = await fs.promises.readFile(
			path.resolve(process.cwd(), 'static', 'features', feature),
			'utf-8'
		);

		for (const key in config) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			res = res.replaceAll(`{{ ${key} }}`, String((config as any)[key]));
		}

		return res;
	});
};
