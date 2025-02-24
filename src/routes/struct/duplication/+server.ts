import { Struct } from 'drizzle-struct/back-end';
import { z } from 'zod';

export const POST = async ({ request }) => {
    const apiKey = request.headers.get('x-db-api-key');

    if (process.env.DATABASE_API_KEY !== apiKey) {
        return new Response('Invalid api key', {
            status: 403
        });
    }

    const reader = request.body?.getReader();
    if (!reader) {
        return new Response('No readable stream', { status: 400 });
    }

    const decoder = new TextDecoder();
    let buffer = '';

    // Read the stream into an array of chunks
    const chunks: Promise<string>[] = [];
    
    let done = false;
    while (!done) {
        chunks.push(reader.read().then(({ value, done: isDone }) => {
            done = isDone;
            return value ? decoder.decode(value, { stream: true }) : '';
        }));
    }

    // Wait for all chunks to be read
    const resolvedChunks = await Promise.all(chunks);
    buffer = resolvedChunks.join('');

    // Process individual JSON objects (assuming newline-delimited JSON)
    const jsonObjects = buffer
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    await Promise.all(
        jsonObjects.map(async (jsonString) => {
            try {
                const json = z.object({
                    struct: z.string(),
                    data: z.unknown(),
                }).parse(JSON.parse(jsonString));

                const struct = Struct.structs.get(json.struct);
                if (!struct) throw new Error(`Struct ${json.struct} not found`);

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await struct.new(json.data as any, {
                    overwriteGenerators: true,
                    overwriteGlobals: true,
                    emit: false,
                }).then(result => result.unwrap());
                
            } catch (err) {
                console.error('Invalid JSON:', jsonString, err);
            }
        })
    );

    return new Response('Stream received', { status: 200 });
};
