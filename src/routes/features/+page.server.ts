import { getFeatureList } from "$lib/utils/features";

export const load = async () => {
    const features = await getFeatureList().unwrap();
    return {
        features,
    }
};