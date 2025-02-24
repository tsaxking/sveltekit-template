import { Struct } from 'drizzle-struct/back-end';

const isValidURL = (url: string): boolean => {
    const urlPattern = /^(https?:\/\/)?((localhost(:\d+)?|([\w-]+\.)+[\w-]+))(\/[\w-.~:?#[\]@!$&'()*+,;=]*)*\/?$/i;
    return urlPattern.test(url);
};


export default async (destination: string, apiKey: string) => {
    if (!isValidURL(destination)) throw new Error('Invalid url');


    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            const send = (struct: string, data: unknown) => {
                controller.enqueue(encoder.encode(JSON.stringify({ struct, data })) + '\n');
            }

            Struct.each(s => {
                s.all({
                    type: 'stream',
                }).pipe(d => {
                    send(s.name, d.data);
                });
            });
        }
    });

    const res = await fetch('/api/stream', { method: 'POST', body: stream, headers: {
        'x-db-api-key': apiKey,
    } });

    if (!res.ok) throw new Error('Request failed: ' + await res.text());
    console.log('Succeeded:', await res.text());
};