import { json } from '@sveltejs/kit';
import { z } from 'zod';

export const POST = async (event) => {
    const data = await event.request.json();

    const schema = z.array(z.object({
        struct: z.string(),
        type: z.string(),
        data: z.unknown(),
        id: z.string(),
        date: z.string().date(),
    }));

    return json(await Promise.all(
        schema.parse(data).map((item) => {
            return event.fetch(`/struct/${item.struct}/${item.type}`, {
                body: JSON.stringify(item.data),
                method: 'POST',
            }).then(r => r.json());
        }),
    ));
};