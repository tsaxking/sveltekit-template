import path from 'path';
import { generateSearchFile, searchFile } from '../src/lib/server/utils/files';

export default async () => {
	await generateSearchFile(path.resolve(process.cwd(), 'src', 'routes'), 'routes').unwrap();

	const search = await searchFile('routes', 'script').unwrap();

	console.log(search);

	return search;
};
