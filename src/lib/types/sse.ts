import z from 'zod';

export const ConnectionStateSchema = z.object({});

export type ConnectionState = z.infer<typeof ConnectionStateSchema>;
