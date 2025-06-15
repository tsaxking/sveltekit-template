import showdown from 'showdown';
import fs from 'fs/promises';
import path from 'path';
import { fileTree } from '$lib/server/utils/files.js';
import { fail } from '@sveltejs/kit';


export const load = async (event) => {
    const md = await fs.readFile(
        path.join(process.cwd(), 'private', 'releases', event.params.filepath + '/index.md'),
        'utf-8',
    );

    const tree = await fileTree(
        path.join(process.cwd(), 'private', 'releases'),
    );

    if (tree.isErr()) {
        throw fail(500);
    }

    return {
        md,
        tree: tree.value,
    }
};