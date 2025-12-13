import z from 'zod';

// You may add more to the config file if you please
// Be sure to alter config.schema.json and config.example.json accordingly

export default z.object({
	environment: z.enum(['dev', 'test', 'prod', 'staging']),
	app_name: z.string().min(1),
	network: z.object({
		host: z.string().min(1),
		port: z.number().min(1).max(65535),
		protocol: z.enum(['http', 'https'])
	}),
	database: z.object({
		port: z.number().min(1).max(65535),
		host: z.string().min(1),
		user: z.string().min(1),
		pass: z.string().min(1),
		name: z.string().min(1)
	}),
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
	})
});
