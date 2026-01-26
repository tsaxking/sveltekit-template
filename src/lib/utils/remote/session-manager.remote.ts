import { getRequestEvent, query, command } from '$app/server';
import { uuid } from '$lib/server/services/uuid';
import { SessionManager } from '$lib/server/services/session-manager';
import z from 'zod';
import { sse } from '$lib/server/services/sse';
import { ConnectionStateSchema } from '$lib/types/sse';
import { config } from '$lib/server/utils/env';
import { isAdmin } from './utils.remote';

export const isOwner = query(z.string(), (data) => {
	const manager = SessionManager.managers.get(data);
	if (!manager) return false;
	const ownerConnection = getRequestEvent().locals.sse;
	if (!ownerConnection) return false;
	return manager.owner === ownerConnection;
});

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

export const closeManager = command(z.string(), async (managerId) => {
	if (!(await isAdmin())) throw new Error('Unauthorized to close session manager.');
	const manager = SessionManager.managers.get(managerId);
	if (!manager) throw new Error('Session manager not found: ' + managerId);
	if (!isOwner(managerId)) throw new Error('Not the owner of the session manager: ' + managerId);
	manager.delete();
});

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

export const getActiveConnections = query(async () => {
	if (!(await isAdmin())) throw new Error('Unauthorized to get active connections.');
	return Array.from(sse.connections.values()).map((con) => ({
		id: con.uuid,
		sessionId: con.sessionId,
		url: con.url,
		generalizedUrl: con.generalizedUrl
	}));
});

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
