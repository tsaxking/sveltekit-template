/**
 * @fileoverview SSE connection state types.
 *
 * @example
 * import { ConnectionStateSchema } from '$lib/types/sse';
 */
import z from 'zod';

/**
 * Runtime schema for connection state payloads.
 */
export const ConnectionStateSchema = z.object({});

/**
 * Connection state payload type.
 */
export type ConnectionState = z.infer<typeof ConnectionStateSchema>;
