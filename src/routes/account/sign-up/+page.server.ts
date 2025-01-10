import { Account } from '$lib/server/structs/account.js';
import { fail, redirect } from '@sveltejs/kit';
import { ServerCode } from 'ts-utils/status';
import { z } from 'zod';
import { passwordStrength } from 'check-password-strength';

export const actions = {
    register: async (event) => {
        const data = await event.request.formData();

        const username = z.string().min(3).max(20).safeParse(data.get('username'));
        const email = z.string().email().safeParse(data.get('email'));
        const firstName = z.string().min(3).max(20).safeParse(data.get('firstName'));
        const lastName = z.string().min(3).max(20).safeParse(data.get('lastName'));
        const password = z.string().min(8).max(20).safeParse(data.get('password'));
        const confirmPassword = z.string().min(8).max(20).safeParse(data.get('confirmPassword'));
        

        // Type check - ensure they didn't send files and that all fields are present and correct
        {
            if (!username.success) {
                return fail(ServerCode.badRequest, {
                    message: 'Invalid username',
                    error: username.error.issues[0]?.message.replace('String', 'Username'),
                });
            }

            if (!email.success) {
                return fail(ServerCode.badRequest, {
                    message: 'Invalid email',
                    error: email.error.issues[0]?.message.replace('String', 'Username'),
                });
            }

            if (!firstName.success) {
                return fail(ServerCode.badRequest, {
                    message: 'Invalid first name',
                    error: firstName.error.issues[0]?.message.replace('String', 'First name'),
                });
            }

            if (!lastName.success) {
                return fail(ServerCode.badRequest, {
                    message: 'Invalid last name',
                    error: lastName.error.issues[0]?.message.replace('String', 'Last name'),
                });
            }

            if (!password.success) {
                return fail(ServerCode.badRequest, {
                    message: 'Invalid password',
                    error: password.error.issues[0]?.message.replace('String', 'Password'),
                });
            }

            if (!confirmPassword.success) {
                return fail(ServerCode.badRequest, {
                    message: 'Invalid confirm password',
                    error: confirmPassword.error.issues[0]?.message.replace('String', 'Confirm password'),
                });
            }

            if (password.data !== confirmPassword.data) {
                return fail(ServerCode.badRequest, {
                    message: 'Passwords do not match',
                });
            }
        }
        
        // Password strength
        {
            const strength = passwordStrength(password.data);

            if (strength.id < 2) {
                return fail(ServerCode.badRequest, {
                    message: 'Password is not strong enough. Please include at least one uppercase letter, one lowercase letter, one number, and one special character, with a minimum length of 8 characters.',
                    error: 'Password is not strong enough',
                });
            }
        }

        // Check if user exists
        {
            const byEmail = await Account.Account.fromProperty('email', email.data, false);
            const byUser = await Account.Account.fromProperty('username', username.data, false);

            if (byEmail.isErr()) return fail(ServerCode.internalServerError, {
                message: 'Failed to check if email exists',
                error: 'Failed to check if email exists',
            });

            if (byUser.isErr()) return fail(ServerCode.internalServerError, {
                message: 'Failed to check if username exists',
                error: 'Failed to check if username exists',
            });

            if (byEmail.value.length) return fail(ServerCode.badRequest, {
                message: 'Account with that email already exists',
            });

            if (byUser.value.length) return fail(ServerCode.badRequest, {
                message: 'Account with that username already exists',
            });
        }

        const account = await Account.createAccount({
            username: username.data,
            email: email.data,
            firstName: firstName.data,
            lastName: lastName.data,
            password: password.data
        });

        if (account.isErr()) {
            console.error(account.error);
            return fail(ServerCode.internalServerError, {
                message: 'Failed to create account',
                error: "Failed to create account",
            });
        }

        return redirect(ServerCode.permanentRedirect, '/account/sign-in');
    },
};