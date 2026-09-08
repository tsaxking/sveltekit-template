<script lang="ts">
	import { SupaStruct } from '$lib/services/supabase/supastruct.svelte';
	import { onMount } from 'svelte';

	const { data } = $props();

	type TestResult = { name: string; pass: boolean; detail: string };

	let results = $state<TestResult[]>([]);
	let done = $state(false);
	let pass = $state(false);

	const ok = (name: string, detail: string) => {
		results.push({ name, pass: true, detail });
	};

	const err = (name: string, detail: string) => {
		results.push({ name, pass: false, detail });
	};

	const run = async () => {
		results = [];
		done = false;
		pass = false;

		const prefix = `t-${Math.random().toString(36).slice(2, 7)}`;
		const writer = SupaStruct.get({
			client: data.supabase,
			table: 'test',
			schema: 'test',
			index_db: false,
			debug: false
		});
		const joinWriter = SupaStruct.get({
			client: data.supabase,
			table: 'join_test',
			schema: 'test',
			index_db: false,
			debug: false
		});

		const ids: string[] = [];
		const joinIds: number[] = [];

		try {
			const created = await writer.new(
				...Array.from({ length: 5 }, (_, i) => ({
					// id: `${prefix}-${i}-${Date.now()}`,
					id: crypto.randomUUID(),
					name: `${prefix}-${i}`,
					age: 20 + i,
					archived: false,
					created_at: new Date().toISOString()
				}))
			);
			if (created.isErr()) {
				err('create', created.error.message);
			} else {
				const rows = created.unwrap();
				rows.forEach((row, i) => {
					ids.push(String(row.id));
					ok(`create-${i}`, `id=${row.id}`);
				});
			}

			if (!ids.length) throw new Error('No rows were created');

			for (const id of ids) {
				const row = await writer.fromId(id);
				if (row.isErr()) err(`fromId-${id}`, row.error.message);
				else ok('fromId', `found id=${row.unwrap().id}`);
			}

			const allRows = await writer.all();
			const allList = (Array.isArray(allRows) ? allRows : allRows.unwrap()) as Array<{
				raw: { name?: string };
			}>;
			const allMatches = allList.filter((row) =>
				String(row.raw.name ?? '').startsWith(prefix)
			).length;
			if (allMatches >= 5) ok('all', `${allMatches} rows matched this prefix`);
			else err('all', `expected at least 5, got ${allMatches}`);

			const getRows = await writer.get({ name: `${prefix}-0` } as Parameters<typeof writer.get>[0]);
			const getList = (Array.isArray(getRows) ? getRows : getRows.unwrap()) as Array<{
				raw: { name?: string };
			}>;
			if (getList.some((row) => row.raw.name === `${prefix}-0`))
				ok('get', `${getList.length} matching row(s)`);
			else err('get', 'expected row matching name');

			const getOrRows = await writer.getOR({
				name: `${prefix}-0`,
				age: 20
			} as Parameters<typeof writer.getOR>[0]);
			const getOrList = Array.isArray(getOrRows) ? getOrRows : getOrRows.unwrap();
			if (getOrList.length >= 1) ok('getOR', `${getOrList.length} row(s) matched`);
			else err('getOR', 'no rows matched getOR');

			const searchRows = await writer.search({
				type: 'and',
				conditions: [
					{ field: 'name', operator: 'ilike', value: `${prefix}%` },
					{ field: 'age', operator: 'gte', value: 20 }
				]
			});
			const searchList = Array.isArray(searchRows) ? searchRows : searchRows.unwrap();
			if (searchList.length >= 5) ok('search', `${searchList.length} matched`);
			else err('search', `expected >=5, got ${searchList.length}`);

			const pagedQuery = writer.search({
				field: 'name',
				operator: 'ilike',
				value: `${prefix}%`
			});
			const pageOne = await pagedQuery.paginated.page(1, 2);
			const pageTwo = await pagedQuery.paginated.page(2, 2);
			if (pageOne.data.length + pageTwo.data.length >= 4)
				ok('paginate', `p1=${pageOne.data.length}, p2=${pageTwo.data.length}`);
			else err('paginate', `p1+p2 was ${pageOne.data.length + pageTwo.data.length}`);

			const firstRow = await pagedQuery.first();
			if (firstRow.isErr()) err('first', firstRow.error.message);
			else if (!firstRow.value) err('first', 'returned null');
			else ok('first', `id=${firstRow.value.id}`);

			const lastRow = await pagedQuery.last();
			if (lastRow.isErr()) err('last', lastRow.error.message);
			else if (!lastRow.value) err('last', 'returned null');
			else ok('last', `id=${lastRow.value.id}`);

			const syncRows = await pagedQuery.sync(0);
			if (Array.isArray(syncRows)) ok('sync', `${syncRows.length} rows returned`);
			else err('sync', 'unexpected sync result shape');

			const joinRows = await joinWriter.new(
				...ids.map((id, index) => ({
					id: index + 1 + Math.floor(Date.now() / 1000),
					test_id: id,
					archived: false,
					created_at: new Date().toISOString()
				}))
			);
			if (joinRows.isErr()) err('join-create', joinRows.error.message);
			else {
				const rows = joinRows.unwrap();
				rows.forEach((row) => joinIds.push(Number(row.id)));
				ok('join-create', `${rows.length} join rows created`);
			}

			const joinQuery = writer.join(joinWriter, {
				whereB: { test_id: ids[0] },
				requiredA: ['id', 'name', 'age'],
				requiredB: ['id', 'test_id']
			});

			const joinResult = await joinQuery.fetch_all();
			if (joinResult.isErr()) err('join-fetch', joinResult.error.message);
			else {
				if (joinResult.value.length >= 1)
					ok('join-fetch', `${joinResult.value.length} joined rows`);
				else err('join-fetch', 'no join rows returned');
			}

			const joinCount = await joinQuery.count();
			if (joinCount.isErr()) err('join-count', joinCount.error.message);
			else ok('join-count', `count=${joinCount.value}`);

			const joinPage = await joinQuery.paginated.page(1, 10);
			ok('join-page', `page=${joinPage.data.length}`);

			const joinFirst = await joinQuery.first();
			if (joinFirst.isErr()) err('join-first', joinFirst.error.message);
			else if (!joinFirst.value) err('join-first', 'null result');
			else ok('join-first', `id=${joinFirst.value.id}`);

			const joinLast = await joinQuery.last();
			if (joinLast.isErr()) err('join-last', joinLast.error.message);
			else if (!joinLast.value) err('join-last', 'null result');
			else ok('join-last', `id=${joinLast.value.id}`);

			const joinSync = await joinQuery.sync(0);
			if (Array.isArray(joinSync)) ok('join-sync', `${joinSync.length} rows synced`);
			else err('join-sync', 'unexpected join sync shape');

			const updated = await writer.fromId(ids[0]);
			if (updated.isErr()) err('update', updated.error.message);
			else {
				const save = await updated.unwrap().update({ age: 99, name: `${prefix}-updated` });
				if (save.isErr()) err('update', save.error.message);
				else {
					const after = await writer.fromId(ids[0]);
					if (after.isErr()) err('update-verify', after.error.message);
					else if (
						after.unwrap().raw.age !== 99 ||
						after.unwrap().raw.name !== `${prefix}-updated`
					) {
						err('update-verify', 'updated data mismatch');
					} else ok('update', 'row updated and verified');
				}
			}

			for (const id of ids) {
				const row = await writer.fromId(id);
				if (row.isErr()) continue;
				const del = await row.unwrap().delete();
				if (del.isErr()) err(`delete-${id}`, del.error.message);
				else ok(`delete-${id}`, 'deleted');
			}

			for (const id of joinIds) {
				const row = await joinWriter.fromId(String(id));
				if (row.isErr()) continue;
				const del = await row.unwrap().delete();
				if (del.isErr()) err(`join-delete-${id}`, del.error.message);
				else ok(`join-delete-${id}`, 'deleted');
			}
		} catch (error) {
			err('run', error instanceof Error ? error.message : String(error));
		} finally {
			pass = results.every((result) => result.pass);
			done = true;
		}
	};

	onMount(() => void run());
</script>

<div id="supabase-tests" data-complete={done} data-pass={pass}>
	<h2>Supabase Tests — {done ? (pass ? 'PASS' : 'FAIL') : 'running…'}</h2>
	<div id="data-complete" style="display: {done ? 'block' : 'none'};">Tests complete!</div>
	<table>
		<thead><tr><th>Test</th><th>Result</th><th>Detail</th></tr></thead>
		<tbody>
			{#each results as r, i (`${r.name}-${i}`)}
				<tr>
					<td>{r.name}</td>
					<td style="color:{r.pass ? 'lightgreen' : 'salmon'}">{r.pass ? 'pass' : 'fail'}</td>
					<td>{r.detail}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
