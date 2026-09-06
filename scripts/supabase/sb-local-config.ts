import sbParseLog from './sb-parse-log';
import fs from 'fs';
import path from 'path';

const setEnvFileVars = (vars: Record<string, string>) => {
	const envPath = path.join(process.cwd(), '.env');
	const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
	const lines = existing.length ? existing.split(/\r?\n/) : [];

	for (const [key, value] of Object.entries(vars)) {
		const line = `${key}=${value}`;
		const index = lines.findIndex((entry) => entry.startsWith(`${key}=`));
		if (index === -1) {
			lines.push(line);
		} else {
			lines[index] = line;
		}
	}

	const output = lines.join('\n').trimEnd() + '\n';
	fs.writeFileSync(envPath, output, 'utf-8');
};

export default async () => {
	const parsed = sbParseLog();
	const vars = {
		SB_STUDIO_URL: parsed.development_tools_studio,
		SB_MAILPIT_URL: parsed.development_tools_mailpit,
		SB_MCP_URL: parsed.development_tools_mcp,
		SB_PROJECT_URL: parsed.apis_project_url.replace('127.0.0.1', 'localhost'),
		SB_DB_URL: parsed.database_url,
		SB_PUBLIC_KEY: parsed.authentication_keys_publishable,
		SB_SECRET_KEY: parsed.authentication_keys_secret,
		SB_STORAGE_ENDPOINT: parsed.storage_s3_url.replace(parsed.apis_project_url, ''),
		SB_STORAGE_ACCESS_KEY: parsed.storage_s3_access_key,
		SB_STORAGE_SECRET_KEY: parsed.storage_s3_secret_key,
		SB_REGION: parsed.storage_s3_region,
		SB_PUBLIC_URL: parsed.apis_project_url.replace('127.0.0.1', 'localhost'),
		SB_POSTGRES_PASSWORD: 'postgres',
		SB_TENANT_ID: ''
	};

	setEnvFileVars(vars);
};
