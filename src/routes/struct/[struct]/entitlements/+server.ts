import { getEntitlements } from '$lib/server/utils/entitlements';

export const GET = async () => {
	const entitlements = await getEntitlements();
	if (entitlements.isErr()) {
		return new Response('Internal Server Error', {
			status: 500
		});
	}

	return new Response(
		JSON.stringify(
			entitlements.value
				.map((e) => ({
					name: e.name,
					structs: e.structs,
					group: e.group
				}))
				.sort((a, b) => a.group.localeCompare(b.group))
		),
		{}
	);
};
