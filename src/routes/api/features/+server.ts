import { getFeatureList } from "$lib/server/utils/features";
import { json } from "@sveltejs/kit";

export const GET = async () => {
    return json(await getFeatureList().unwrap())
};