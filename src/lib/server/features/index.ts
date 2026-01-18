import { Features } from '../services/features';
import { z } from 'zod';
import { Account } from '../structs/account';

// Simple feature - no scopes
Features.register({
	name: 'access-admin-panel',
	description: 'Access to the admin panel'
});

// Feature with typed scopes
Features.register({
	name: 'upload-file',
	description: 'Upload files to the server',
	scopes: {
		type: z.enum(['pdf', 'image', 'csv', 'video']),
		maxSize: z.number().positive()
	},
	check: async (account, { type, maxSize }) => {
		const MAX_FREE_SIZE = 5 * 1024 * 1024; // 5MB
		const isAdmin = (await Account.isAdmin(account)).unwrapOr(false);

		// Large files or video require admin privileges
		if (maxSize > MAX_FREE_SIZE) {
			return isAdmin;
		}

		if (type === 'video') {
			return isAdmin;
		}

		return true;
	}
});

// Feature with complex scopes
Features.register({
	name: 'export-data',
	description: 'Export data in various formats',
	scopes: {
		format: z.enum(['csv', 'json', 'pdf', 'excel']),
		scope: z.enum(['own', 'team', 'organization']),
		limit: z.number().int().positive().optional()
	},
	check: async (account, { format, scope, limit }) => {
		const isAdmin = (await Account.isAdmin(account)).unwrapOr(false);

		if (format === 'pdf') {
			return isAdmin;
		}

		if (scope === 'organization') {
			return isAdmin;
		}

		if (limit && limit > 10000) {
			return isAdmin;
		}

		return true;
	}
});

// Feature for page access
Features.register({
	name: 'access-page',
	description: 'Access a specific page',
	scopes: {
		path: z.string(),
		method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional()
	}
});
