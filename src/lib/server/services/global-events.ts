/**
 * @fileoverview Global event emitter for server-side cross-module events.
 *
 * Extend the `Events` type to add strongly-typed event payloads.
 *
 * @example
 * import events from '$lib/server/services/global-events';
 * events.on('some-event' as never, (payload) => console.log(payload));
 */
import { ComplexEventEmitter } from 'ts-utils/event-emitter';

/**
 * Map of event names to payload types.
 */
export type Events = {};

/**
 * Shared event emitter instance.
 */
export default new ComplexEventEmitter<Events>();
