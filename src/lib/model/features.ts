import { Requests } from "$lib/utils/requests";
import z from "zod";

export namespace Features {
    export const getFeatureList = () => Requests.get('/api/features', {
        cache: true,
        expectStream: false,
        parser: z.array(z.object({
            name: z.string(),
            description: z.string(),
            date: z.number(),
        }))
    });
}