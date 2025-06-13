import { PropertyAction, DataAction } from 'drizzle-struct/types';
import { Account } from './structs/account';
import { z } from 'zod';
import terminal from '$lib/server/utils/terminal';
import { json } from '@sveltejs/kit';

export enum EventErrorCode {
	NoStruct = 'no_struct',
	NoAccount = 'no_account',
	InvalidBody = 'invalid_body',
	NoData = 'no_data',
	InternalError = 'internal_error',
	NotPermitted = 'not_permitted',
	NoVersion = 'no_version',
	InvalidAction = 'invalid_action',
	Unknown = 'unknown',
	Blocked = 'blocked'
}

export enum EventSuccessCode {
	OK = 'ok'
}

export const status = (
	status: {
		success: boolean;
		code: EventSuccessCode | EventErrorCode;
		message?: string;
		data?: unknown;
		errors?: unknown;
	},
	init: {
		status: number;
	}
) => {
	return json(status, init);
};

export const Errors = {
	noFrontend: (structName: string) => {
		terminal.warn(`Errors.noFrontend: Struct "${structName}" is not a frontend capable struct`);
		return status(
			{
				success: false,
				message: `Struct ${structName} is not a frontend capable struct`,
				code: EventErrorCode.InvalidBody
			},
			{ status: 400 }
		);
	},

	noStruct: (structName: string) => {
		terminal.warn(`Errors.noStruct: Struct "${structName}" not found`);
		return status(
			{
				success: false,
				message: `Struct ${structName} not found`,
				code: EventErrorCode.NoStruct
			},
			{ status: 404 }
		);
	},

	noAccount: () => {
		terminal.warn(`Errors.noAccount: Request made with no authenticated account`);
		return status(
			{
				success: false,
				message: 'No authenticated account found',
				code: EventErrorCode.NoAccount
			},
			{ status: 401 }
		);
	},

	invalidBody: (error: z.ZodError) => {
		terminal.warn(`Errors.invalidBody: Invalid request body`, error.errors);
		return status(
			{
				success: false,
				message: 'Invalid request body',
				errors: error.errors,
				code: EventErrorCode.InvalidBody
			},
			{ status: 400 }
		);
	},

	noData: (id: string) => {
		terminal.warn(`Errors.noData: Data with id "${id}" not found`);
		return status(
			{
				success: false,
				message: `Data with id ${id} not found`,
				code: EventErrorCode.NoData
			},
			{ status: 404 }
		);
	},

	internalError: (error: Error) => {
		terminal.error(`Errors.internalError: ${error.message}`, error.stack ?? error);
		return status(
			{
				success: false,
				message: 'Internal server error',
				code: EventErrorCode.InternalError
			},
			{ status: 500 }
		);
	},

	notPermitted: (
		account: Account.AccountData,
		action: DataAction | PropertyAction,
		structName: string
	) => {
		terminal.warn(
			`Errors.notPermitted: Account ${account.id} is not permitted to perform ${action} on ${structName}`
		);
		return status(
			{
				success: false,
				message: `Account ${account.id} is not permitted to perform ${action} on ${structName}`,
				code: EventErrorCode.NotPermitted
			},
			{ status: 403 }
		);
	},

	noVersion: (vhId: string) => {
		terminal.warn(`Errors.noVersion: Version with vhId "${vhId}" not found`);
		return status(
			{
				success: false,
				message: `Version with vhId ${vhId} not found`,
				code: EventErrorCode.NoVersion
			},
			{ status: 404 }
		);
	},

	invalidAction: (action: string) => {
		terminal.warn(`Errors.invalidAction: Invalid action "${action}"`);
		return status(
			{
				success: false,
				message: `Invalid action ${action}`,
				code: EventErrorCode.InvalidAction
			},
			{ status: 400 }
		);
	},

	blocked: (struct: string, action: DataAction | PropertyAction, reason: string) => {
		terminal.warn(
			`Errors.blocked: Struct "${struct}" is blocked from performing ${action}`,
			reason
		);
		return status(
			{
				success: false,
				message: `Struct ${struct} is blocked from performing ${action} - ${reason}`,
				code: EventErrorCode.Blocked
			},
			{ status: 403 }
		);
	}
};

export const Success = {
	ok: (data?: unknown) => {
		return status(
			{
				success: true,
				code: EventSuccessCode.OK,
				data
			},
			{ status: 200 }
		);
	}
};
