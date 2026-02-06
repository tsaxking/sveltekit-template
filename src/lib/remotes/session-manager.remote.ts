/**
 * @fileoverview Session manager RPC endpoints for SSE connection orchestration.
 *
 * Each `query()`/`command()` curries a handler with a Zod schema that validates
 * inputs at the boundary, enabling type-safe and permission-safe usage on both
 * client and server.
 *
 * @example
 * import * as smRemote from '$lib/remotes/session-manager.remote';
 * const id = await smRemote.startManager();
 */
import { getRequestEvent, query, command } from '$app/server';
import { uuid } from '$lib/server/services/uuid';
import { SessionManager } from '$lib/server/services/session-manager';
import z from 'zod';
import { sse } from '$lib/server/services/sse';
import { ConnectionStateSchema } from '$lib/types/sse';
import { config } from '$lib/server/utils/env';
import { isAdmin } from './index.remote';

/**
 * Checks whether the current SSE connection is the owner of a manager.
 *
 * @param {string} data - Session manager id.
 */
export const isOwner = query(z.string(), (data) => {
	const manager = SessionManager.managers.get(data);
	if (!manager) return false;
	const ownerConnection = getRequestEvent().locals.sse;
	if (!ownerConnection) return false;
	return manager.owner === ownerConnection;
});

/**
 * Creates and starts a new session manager.
 */
export const startManager = command(async () => {
	if (!(await isAdmin())) throw new Error('Unauthorized to start session manager.');
	const id = uuid();
	const ownerConnection = getRequestEvent().locals.sse;
	if (!ownerConnection) throw new Error('No SSE connection found for session manager owner.');
	const manager = new SessionManager(id, ownerConnection, [], {
		lifetime: 3600_000 // 1 hour
	});
	manager.init();
	return id;
});

/**
 * Sends an event to all connections in a manager.
 *
 * @param {object} params - Send parameters.
 * @param {string} params.manager - Manager id.
 * @param {string} params.event - Event name.
 * @param {unknown} params.data - Event payload.
 */
export const managerSend = command(
	z.object({
		manager: z.string(),
		event: z.string(),
		data: z.unknown()
	}),
	async (data) => {
		if (!(await isAdmin())) throw new Error('Unauthorized to send session manager event.');
		const manager = SessionManager.managers.get(data.manager);
		if (!manager) throw new Error('Session manager not found: ' + data.manager);
		if (!isOwner(data.manager))
			throw new Error('Not the owner of the session manager: ' + data.manager);
		manager.send(data.event, data.data);
	}
);

/**
 * Closes and deletes a session manager.
 *
 * @param {string} managerId - Manager id.
 */
export const closeManager = command(z.string(), async (managerId) => {
	if (!(await isAdmin())) throw new Error('Unauthorized to close session manager.');
	const manager = SessionManager.managers.get(managerId);
	if (!manager) throw new Error('Session manager not found: ' + managerId);
	if (!isOwner(managerId)) throw new Error('Not the owner of the session manager: ' + managerId);
	manager.delete();
});

/**
 * Returns grouped connections for a manager.
 *
 * @param {string} managerId - Manager id.
 */
export const getManagerConnections = query(z.string(), async (managerId) => {
	if (!(await isAdmin())) throw new Error('Unauthorized to get session manager connections.');
	const manager = SessionManager.managers.get(managerId);
	if (!manager) throw new Error('Session manager not found: ' + managerId);
	if (!isOwner(managerId)) throw new Error('Not the owner of the session manager: ' + managerId);
	return manager.getConnections().map((c) =>
		c.connections.map((con) => ({
			id: con.uuid,
			sessionId: con.sessionId,
			url: con.url,
			generalizedUrl: con.generalizedUrl,
			state: con.state
		}))
	);
});

/**
 * Sends a redirect command to an SSE connection.
 *
 * @param {object} params - Redirect parameters.
 * @param {string} params.id - Connection id.
 * @param {string} params.url - Target URL.
 * @param {string} [params.reason] - Optional reason.
 */
export const redirectConnection = command(
	z.object({
		id: z.string(),
		url: z.string(),
		reason: z.string().optional()
	}),
	async ({ id, url, reason }) => {
		if (!(await isAdmin())) throw new Error('Unauthorized to redirect connection.');
		const connection = sse.getConnection(id);
		if (!connection) throw new Error('Connection not found: ' + id);
		connection.redirect(url, reason);
	}
);

/**
 * Requests a connection reload.
 *
 * @param {object} params - Reload parameters.
 * @param {string} params.id - Connection id.
 * @param {string} [params.reason] - Optional reason.
 */
export const reloadConnection = command(
	z.object({
		id: z.string(),
		reason: z.string().optional()
	}),
	async ({ id, reason }) => {
		if (!(await isAdmin())) throw new Error('Unauthorized to reload connection.');
		const connection = sse.getConnection(id);
		if (!connection) throw new Error('Connection not found: ' + id);
		connection.reload(reason);
	}
);

/**
 * Sends a custom event to a single connection.
 *
 * @param {object} params - Send parameters.
 * @param {string} params.id - Connection id.
 * @param {string} params.event - Event name.
 * @param {unknown} params.data - Event payload.
 */
export const sendToConnection = command(
	z.object({
		id: z.string(),
		event: z.string(),
		data: z.unknown()
	}),
	async ({ id, event, data }) => {
		if (!(await isAdmin())) throw new Error('Unauthorized to send to connection.');
		const connection = sse.getConnection(id);
		if (!connection) throw new Error('Connection not found: ' + id);
		connection.send(event, data);
	}
);

/**
 * Returns a flat list of active connections.
 */
export const getActiveConnections = query(async () => {
	if (!(await isAdmin())) throw new Error('Unauthorized to get active connections.');
	return Array.from(sse.connections.values()).map((con) => ({
		id: con.uuid,
		sessionId: con.sessionId,
		url: con.url,
		generalizedUrl: con.generalizedUrl
	}));
});

/**
 * Reports connection state back to the server when enabled.
 *
 * @param {object} params - Report parameters.
 * @param {ConnectionStateSchema} params.state - Connection state payload.
 */
export const reportState = command(
	z.object({
		state: ConnectionStateSchema
	}),
	async ({ state }) => {
		if (!config.sse.do_report) return;
		const event = getRequestEvent();
		if (!event.locals.sse) throw new Error('No SSE connection found for reporting state.');

		event.locals.sse.reportState(state);
	}
);
