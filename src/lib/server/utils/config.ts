/**
 * @fileoverview Zod schema for application configuration.
 *
 * Keep this schema in sync with config.schema.json and config.example.json.
 *
 * @example
 * import configSchema from '$lib/server/utils/config';
 * const config = configSchema.parse(JSON.parse(raw));
 */
import z from 'zod';

// You may add more to the config file if you please
// Be sure to alter config.schema.json and config.example.json accordingly

/**
 * Configuration schema definition.
 *
 * @property {'dev'|'test'|'prod'|'staging'} environment - Runtime environment.
 * @property {string} app_name - Application display name.
 * @property {{ host: string; port: number; protocol: 'http'|'https' }} network - Server bind settings.
 * @property {string} network.host - Bind host.
 * @property {number} network.port - Bind port.
 * @property {'http'|'https'} network.protocol - Protocol.
 * @property {{ connectionUrl?: string; port?: number; host?: string; user?: string; pass?: string; name?: string }} database - Database connection.
 * @property {string | undefined} database.connectionUrl - Optional full connection URL (e.g., for Supabase).
 * @property {number | undefined} database.port - Database port.
 * @property {string | undefined} database.host - Database host.
 * @property {string | undefined} database.user - Database user.
 * @property {string | undefined} database.pass - Database password.
 * @property {string | undefined} database.name - Database name.
 * @property {{ auto_sign_in?: string; duration: number; password_request_lifetime: number }} sessions - Session configuration.
 * @property {string | undefined} sessions.auto_sign_in - Optional auto sign-in token.
 * @property {number} sessions.duration - Session lifetime in ms.
 * @property {number} sessions.password_request_lifetime - Password reset lifetime in ms.
 * @property {{ url: string; name: string }} redis - Redis connection config.
 * @property {string} redis.url - Redis URL.
 * @property {string} redis.name - Redis client name.
 * @property {{ enabled: boolean; outdir: string; level: Array<'trace'|'debug'|'info'|'warn'|'error'|'fatal'|'silent'|'struct'> }} logs - Log settings.
 * @property {boolean} logs.enabled - Whether logging is enabled.
 * @property {string} logs.outdir - Log output directory.
 * @property {Array<'trace'|'debug'|'info'|'warn'|'error'|'fatal'|'silent'|'struct'>} logs.level - Log levels enabled.
 * @property {{ user: string; pass: string; email: string; first_name: string; last_name: string }} admin - Bootstrap admin credentials.
 * @property {string} admin.user - Admin username.
 * @property {string} admin.pass - Admin password.
 * @property {string} admin.email - Admin email.
 * @property {string} admin.first_name - Admin first name.
 * @property {string} admin.last_name - Admin last name.
 * @property {{ queue_name: string; max_size: number; support_email: string }} email - Email queue settings.
 * @property {string} email.queue_name - Queue name.
 * @property {number} email.max_size - Maximum queue size.
 * @property {string} email.support_email - Support email address.
 * @property {{ server: string }} ntp - NTP server settings.
 * @property {string} ntp.server - NTP server hostname.
 * @property {{ enabled: boolean; requests: number; window: number }} limiting - Rate-limit settings.
 * @property {boolean} limiting.enabled - Toggle limiting.
 * @property {number} limiting.requests - Max requests per window.
 * @property {number} limiting.window - Window duration in seconds.
 * @property {{ enabled: boolean; interval: number; timeout: number; limit: number; batch_size: number; debug: boolean }} struct_batching - Struct batching settings.
 * @property {boolean} struct_batching.enabled - Toggle batching.
 * @property {number} struct_batching.interval - Batch interval in ms.
 * @property {number} struct_batching.timeout - Batch timeout in ms.
 * @property {number} struct_batching.limit - Batch limit.
 * @property {number} struct_batching.batch_size - Max operations per batch.
 * @property {boolean} struct_batching.debug - Enable batching debug logs.
 * @property {{ enabled: boolean; debug: boolean }} struct_cache - Struct cache settings.
 * @property {boolean} struct_cache.enabled - Toggle cache.
 * @property {boolean} struct_cache.debug - Enable cache debug logs.
 * @property {{ enabled: boolean; db_name: string; version: number; debug: boolean; debounce_interval_ms: number }} indexed_db - IndexedDB settings.
 * @property {boolean} indexed_db.enabled - Toggle IndexedDB caching.
 * @property {string} indexed_db.db_name - Database name.
 * @property {number} indexed_db.version - Database version.
 * @property {boolean} indexed_db.debug - Enable IndexedDB debug logs.
 * @property {number} indexed_db.debounce_interval_ms - Debounce interval in ms.
 * @property {{ debug: boolean; ping_interval_ms: number; state_report_threshold: number; do_report: boolean }} sse - SSE settings.
 * @property {boolean} sse.debug - Enable SSE debug logging.
 * @property {number} sse.ping_interval_ms - Ping interval in ms.
 * @property {number} sse.state_report_threshold - Threshold for state reporting in ms.
 * @property {boolean} sse.do_report - Enable state reporting.
 */
export default z.object({
	environment: z.enum(['dev', 'test', 'prod', 'staging']),
	app_name: z.string().min(1),
	network: z.object({
		host: z.string().min(1),
		port: z.number().min(1).max(65535),
		protocol: z.enum(['http', 'https'])
	}),
	database: z
		.object({
			connectionUrl: z.string().optional(),
			port: z.number().min(1).max(65535).optional(),
			host: z.string().min(1).optional(),
			user: z.string().min(1).optional(),
			pass: z.string().min(1).optional(),
			name: z.string().min(1).optional()
		})
		.refine(
			(data) => {
				// Either connectionUrl OR all individual fields must be provided
				const hasConnectionUrl = !!data.connectionUrl;
				const hasIndividualFields = !!(
					data.host &&
					data.port &&
					data.user &&
					data.pass &&
					data.name
				);
				return hasConnectionUrl || hasIndividualFields;
			},
			{
				message:
					'Either connectionUrl or all of (host, port, user, pass, name) must be provided'
			}
		),
	sessions: z.object({
		auto_sign_in: z.string().optional(),
		duration: z.number().min(1),
		password_request_lifetime: z.number().min(1)
	}),
	redis: z.object({
		url: z.string().url(),
		name: z.string().min(1)
	}),
	logs: z.object({
		enabled: z.boolean(),
		outdir: z.string(),
		level: z.array(z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent', 'struct']))
	}),
	admin: z.object({
		user: z.string().min(1),
		pass: z.string().min(1),
		email: z.string().email(),
		first_name: z.string().min(1),
		last_name: z.string().min(1)
	}),
	email: z.object({
		queue_name: z.string().min(1),
		max_size: z.number().min(1),
		support_email: z.string().email()
	}),
	ntp: z.object({
		server: z.string().min(1)
	}),
	limiting: z.object({
		enabled: z.boolean(),
		requests: z.number().min(1),
		window: z.number().min(1)
	}),
	struct_batching: z.object({
		enabled: z.boolean(),
		interval: z.number().min(1),
		timeout: z.number().min(1),
		limit: z.number().min(1),
		batch_size: z.number().min(1),
		debug: z.boolean()
	}),
	struct_cache: z.object({
		enabled: z.boolean(),
		debug: z.boolean()
	}),
	indexed_db: z.object({
		enabled: z.boolean(),
		db_name: z.string().min(1),
		version: z.number().min(1),
		debug: z.boolean(),
		debounce_interval_ms: z.number().min(0)
	}),
	sse: z.object({
		debug: z.boolean(),
		ping_interval_ms: z.number().min(1000),
		state_report_threshold: z.number().min(5000),
		do_report: z.boolean()
	})
});
