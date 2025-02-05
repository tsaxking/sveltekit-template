import { Account } from '$lib/server/structs/account.js';
import terminal from '$lib/server/utils/terminal.js';
import { fail, redirect } from '@sveltejs/kit';
import { ServerCode } from 'ts-utils/status';
import { z } from 'zod';
import { passwordStrength } from 'check-password-strength';

export const load = async (event) => {
    const pr = await Account.PasswordReset.fromId(event.params.id);

    if (pr.isErr()) {
        terminal.error(pr.error);
        throw fail(
            ServerCode.internalServerError,
        );
    }

    if (!pr.value) {
        throw redirect(
            ServerCode.permanentRedirect,
            `/status/404?url=${event.request.url}`,
        );
    }

    if (new Date(pr.value.data.expires) < new Date()) {
        throw redirect(
            ServerCode.permanentRedirect,
            `/status/404?url=${event.request.url}`,
        );
    }

    const account = await Account.Account.fromId(pr.value.data.accountId);
    if (account.isErr()) {
        terminal.error(account.error);
        throw fail(
            ServerCode.internalServerError,
        );
    }

    if (!account.value) {
        throw redirect(
            ServerCode.permanentRedirect,
            `/status/404?url=${event.request.url}`,
        );
    }

    return {
        account: account.value.data.username,
    }
};

export const actions = {
    reset: async (event) => {
        const pr = await Account.PasswordReset.fromId(event.params.id);

        if (pr.isErr()) {
            terminal.error(pr.error);
            throw fail(
                ServerCode.internalServerError,
            );
        }
    
        if (!pr.value) {
            return {
                redirect: `/status/404?url=${event.request.url}`,
            }
        }
    
        if (new Date(pr.value.data.expires) < new Date()) {
            return {
                redirect: `/status/404?url=${event.request.url}`,
            }
        }
    
        const account = await Account.Account.fromId(pr.value.data.accountId);
        if (account.isErr()) {
            terminal.error(account.error);
            throw fail(
                ServerCode.internalServerError,
            );
        }
    
        if (!account.value) {
            return {
                redirect: `/status/404?url=${event.request.url}`,
            }
        }

        const body = await event.request.formData();
        const password = z.string().safeParse(body.get('password'));
        const confirmPassword = z.string().safeParse(body.get('confirmPassword'));

        if (password.success && confirmPassword.success) {
            if (password.data !== confirmPassword.data) {
                return {
                    message: 'Passwords do not match',
                }
            }

            if (passwordStrength(password.data).id < 2) {
				return {
					message:
						'Password is not strong enough. Please include at least one uppercase letter, one lowercase letter, one number, and one special character, with a minimum length of 8 characters.',
				};
			}

            const hash = Account.newHash(password.data);
            if (hash.isErr()) {
                terminal.error(hash.error);
                throw fail(
                    ServerCode.internalServerError,
                );
            }

            const res = await account.value.update({
                key: hash.value.hash,
                salt: hash.value.salt,
            });

            if (res.isErr()) {
                terminal.error(res.error);
                throw fail(
                    ServerCode.internalServerError,
                );
            }

            await pr.value.delete();

            return {
                redirect: '/account/sign-in',
            }
        }

        throw fail(
            ServerCode.badRequest,
        );
    }
}