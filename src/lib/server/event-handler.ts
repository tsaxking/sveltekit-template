/**
 * @fileoverview Helper utilities for struct event API responses.
 *
 * Defines standard error/success codes and helper factories for consistent
 * JSON responses returned from API handlers.
 *
 * @example
 * import { Success, Errors } from '$lib/server/event-handler';
 * return Success.ok({ id: '123' });
 */
import { PropertyAction, DataAction } from '$lib/types/struct';
import { Account } from './structs/account';
import { z } from 'zod';
import terminal from '$lib/server/utils/terminal';
import { json } from '@sveltejs/kit';

/**
 * Standard error codes for event responses.
 */
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

/**
 * Standard success codes for event responses.
 */
export enum EventSuccessCode {
	OK = 'ok'
}

/**
 * Creates a JSON response using the standard status shape.
 *
 * @param {object} status - Response body.
 * @param {boolean} status.success - Success indicator.
 * @param {EventSuccessCode|EventErrorCode} status.code - Status code.
 * @param {string} [status.message] - Optional message.
 * @param {unknown} [status.data] - Optional payload.
 * @param {unknown} [status.errors] - Optional error details.
 * @param {object} init - Response init.
 * @param {number} init.status - HTTP status code.
 */
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

/**
 * Error response helpers.
 */
export const Errors = {
	/**
	 * Returns a 400 when the struct is not frontend-capable.
	 *
	 * @param {string} structName - Struct name.
	 */
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

	/**
	 * Returns a 404 when a struct is missing.
	 *
	 * @param {string} structName - Struct name.
	 */
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

	/**
	 * Returns a 401 for unauthenticated requests.
	 */
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

	/**
	 * Returns a 400 with Zod validation errors.
	 *
	 * @param {z.ZodError} error - Validation error.
	 */
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

	/**
	 * Returns a 404 when a record id is missing.
	 *
	 * @param {string} id - Record id.
	 */
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

	/**
	 * Returns a 500 for unexpected errors.
	 *
	 * @param {Error} error - Error instance.
	 */
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

	/**
	 * Returns a 403 when an account is not permitted to perform an action.
	 *
	 * @param {Account.AccountData} account - Acting account.
	 * @param {DataAction|PropertyAction} action - Attempted action.
	 * @param {string} structName - Struct name.
	 */
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

	/**
	 * Returns a 404 when a version history id is missing.
	 *
	 * @param {string} vhId - Version history id.
	 */
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

	/**
	 * Returns a 400 for invalid action strings.
	 *
	 * @param {string} action - Action string.
	 */
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

	/**
	 * Returns a 403 when an action is blocked.
	 *
	 * @param {string} struct - Struct name.
	 * @param {DataAction|PropertyAction} action - Attempted action.
	 * @param {string} reason - Block reason.
	 */
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
	},

	/**
	 * Returns a 409 for stale data updates.
	 *
	 * @param {string} message - Error message.
	 */
	outdatedData: (message: string) => {
		terminal.warn(`Errors.outdatedData: ${message}`);
		return status(
			{
				success: false,
				message,
				code: EventErrorCode.InvalidBody
			},
			{ status: 409 }
		);
	}
};

/**
 * Success response helpers.
 */
export const Success = {
	/**
	 * Returns a 200 OK response with optional data.
	 *
	 * @param {unknown} [data] - Optional payload.
	 */
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
