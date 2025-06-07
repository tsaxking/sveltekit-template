/* eslint-disable @typescript-eslint/no-explicit-any */
import { attemptAsync, resolveAll, attempt, type Result } from 'ts-utils/check';
import YAML from 'yaml';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { Struct, StructData, type Blank } from 'drizzle-struct/back-end';
import { DataAction, PropertyAction } from 'drizzle-struct/types';
import type { GlobalCols } from 'drizzle-struct/front-end';
import type { Entitlement } from '$lib/types/entitlements';
import terminal from './terminal';

const ENTITLEMENT_DIR = path.join(process.cwd(), 'private', 'entitlements');
const ENTITLEMENT_FILE = path.join(process.cwd(), 'src', 'lib', 'types', 'entitlements.ts');

export const getEntitlementNames = async () => {
	return attemptAsync(async () => {
		return (await fs.promises.readdir(ENTITLEMENT_DIR))
			.filter((f) => f.endsWith('.yaml') && !f.includes('example'))
			.map((f) => f.replace('.yaml', ''));
	});
};

export const getEntitlements = async () => {
	return attemptAsync(async () => {
		return resolveAll(
			await Promise.all(
				(await getEntitlementNames()).unwrap().map((e) => readEntitlement(e as Entitlement))
			)
		).unwrap();
	});
};

export class CombinedEntitlementPermission {
	public readonly permissions: { action: string; property: string }[];
	constructor(
		public readonly name: Entitlement,
		public readonly struct: string,
		entitlements: EntitlementPermission[],
		public readonly pages: string[]
	) {
		this.permissions = entitlements.flatMap((e) => {
			if (e.permissions.length === 0 || e.permissions.some((p) => p.struct === '*')) {
				return [{ action: '*', property: '*' }];
			}
			return e.permissions
				.filter((p) => p.struct === this.struct || p.struct === '*')
				.map((p) => ({ action: p.action, property: p.property }));
		});
	}
}

export class EntitlementPermission {
	public readonly permissions: { struct: string; action: string; property: string }[];
	constructor(
		public readonly name: Entitlement,
		public readonly structs: string[],
		permissions: string[],
		public readonly pages: string[],
		public readonly group: string
	) {
		this.permissions = permissions.map((p) => {
			if (p === '*') return { action: '*', property: '*', struct: '*' };
			const [struct, action, property] = p.split(':');
			return { struct, action, property };
		});
	}

	_saved = Date.now();

	test<T extends Blank>(
		data: StructData<T, string>,
		action: PropertyAction | DataAction,
		property?: keyof T
	) {
		return attempt(() => {
			if (this.structs.length > 0 && !this.structs.includes(data.struct.name)) {
				return false;
			}
			if (this.permissions.length === 0 || this.permissions.some((p) => p.struct === '*')) {
				return true;
			}
			return this.permissions.some(
				(p) =>
					(p.struct === data.struct.name || p.struct === '*') &&
					(p.action === action || p.action === '*') &&
					(p.property === '*' ||
						(p.property == property &&
							Object.keys(data.struct.data.structure).includes(p.property)))
			);
		});
	}

	canCreate<T extends Blank>(data: Struct<T, string>) {
		return attempt(() => {
			if (this.structs.length > 0 && !this.structs.includes(data.data.name)) {
				return false;
			}
			if (this.permissions.length === 0 || this.permissions.some((p) => p.struct === '*')) {
				return true;
			}
			return this.permissions.some(
				(p) =>
					(p.struct === data.data.name || p.struct === '*') &&
					(p.action === DataAction.Create || p.action === '*')
			);
		});
	}
}

const entitlements = new Map<string, EntitlementPermission>();

setInterval(() => {
	const now = Date.now();
	for (const [key, value] of entitlements) {
		if (now - value._saved > 1000 * 60 * 10) {
			entitlements.delete(key);
		}
	}
}, 1000 * 10);

export const readEntitlement = (entitlement: Entitlement) => {
	return attemptAsync<EntitlementPermission>(async () => {
		const has = entitlements.get(entitlement);
		if (has) {
			has._saved = Date.now();
			return has;
		}
		const e = z
			.object({
				name: z.string(),
				structs: z.array(z.string()),
				permissions: z.array(z.string()),
				pages: z.array(z.string()),
				group: z.string()
			})
			.parse(
				YAML.parse(
					await fs.promises.readFile(path.join(ENTITLEMENT_DIR, entitlement + '.yaml'), 'utf8')
				)
			);
		const E = new EntitlementPermission(
			e.name as Entitlement,
			e.structs,
			e.permissions,
			e.pages,
			e.group
		);
		entitlements.set(entitlement, E);
		return E;
	});
};

const saveEntitlements = async () => {
	const entitlements = await getEntitlements();
	if (entitlements.isErr()) {
		return terminal.error(entitlements);
	}
	return fs.promises.writeFile(
		ENTITLEMENT_FILE,
		`
export type Entitlement = \n    ${entitlements.value.map((e) => `'${e.name}'`).join('\n  | ')};
export type Group = \n    ${Array.from(new Set(entitlements.value.map((e) => `'${e.group}'`))).join('\n  | ')};
		`.trim()
	);
};

// This create process does not need to be optimized because it only runs at the startup process.
// export type Permission<S extends Struct<Blank, string>[]> =
// 	| `${Extract<S[number]['data']['name'], string>}:${PropertyAction | '*'}:${Extract<keyof S[number]['data']['structure'] & GlobalCols, string> | '*'}`
// 	| `${DataAction}`
// 	| '*';

// export type Permission<S extends Struct<Blank, string>[]> =
// 	| `${S[number]['data']['name']}:${PropertyAction | '*'}:${Extract<keyof {
// 			[K in S[number] as K['data']['name']]: K['data']['structure'];
// 		}[S[number]['data']['name']], string> | '*'}`
// 	| `${DataAction}`
// 	| '*';

export type Permission<S extends Struct<Blank, string>[]> =
	| `${Extract<S[number]['data']['name'], string>}:${PropertyAction | '*'}:${
			| Extract<keyof UnionToIntersection<S[number]['data']['structure']>, string>
			| '*'}`
	| `${Extract<S[number]['data']['name'], string>}:${DataAction}`
	| '*';

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
	? I
	: never;

let timeout: NodeJS.Timeout | undefined;

export const createEntitlement = async <S extends Struct[]>(entitlement: {
	name: string;
	group: string;
	structs: S;
	permissions: Permission<S>[]; // Now supports multiple structs
	pages?: string[];
}) => {
	if (!/[a-z0-9-]+/.test(entitlement.name)) {
		throw new Error(
			`Entitlement name must be lowercase and contain only letters, numbers, and hyphens. (${entitlement.name})`
		);
	}
	await fs.promises.mkdir(ENTITLEMENT_DIR, { recursive: true });
	await fs.promises.writeFile(
		path.join(ENTITLEMENT_DIR, entitlement.name + '.yaml'),
		YAML.stringify({
			name: entitlement.name,
			structs: entitlement.structs.map((s) => s.data.name),
			permissions: entitlement.permissions,
			pages: entitlement.pages ?? [],
			group: entitlement.group
		})
	);

	if (timeout) clearTimeout(timeout);
	setTimeout(async () => {
		saveEntitlements();
	});
};
