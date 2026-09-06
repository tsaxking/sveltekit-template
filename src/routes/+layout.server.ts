import terminal from '$lib/server/utils/terminal.js';
import { hasRole } from '$lib/server/utils/auth.js';
import { error, redirect } from '@sveltejs/kit';
import { SupaStruct } from '$lib/services/supabase/supastruct.svelte';
import env from '$lib/server/utils/env';

export const load = async (event) => {
	const { data: userData, error: userError } = await event.locals.supabase.auth.getUser();
	const env_data = {
		environment: env.ENVIRONMENT,
		name: env.APP_NAME,
		supabase: {
			url: env.SB_PUBLIC_URL,
			public_key: env.SB_PUBLIC_KEY,
			s3_access_key: env.SB_STORAGE_ACCESS_KEY
		}
	};

	if (userError) {
		terminal.error('Error getting user from session:', userError);
		return {
			user: null,
			cookies: event.cookies.getAll(),
			is_mentor: false,
			is_student: false,
			is_viewer: false,
			env: env_data
		};
	}

	if (!userData?.user) {
		throw redirect(303, '/account/sign-in');
	}

	const ProfileStruct = SupaStruct.get({
		client: event.locals.supabase,
		schema: 'core',
		table: 'profile'
	});

	const [is_mentor, is_student, is_viewer, profile] = await Promise.all([
		hasRole(event.locals.supabase, 'Mentor'),
		hasRole(event.locals.supabase, 'Student'),
		hasRole(event.locals.supabase, 'Viewer'),
		ProfileStruct.get({ id: userData.user.id }).first()
	]);

	if (is_mentor.isErr()) {
		terminal.error('Error checking mentor role:', is_mentor.error);
		throw error(500, 'Internal Server Error');
	}

	if (is_student.isErr()) {
		terminal.error('Error checking student role:', is_student.error);
		throw error(500, 'Internal Server Error');
	}

	if (is_viewer.isErr()) {
		terminal.error('Error checking viewer role:', is_viewer.error);
		throw error(500, 'Internal Server Error');
	}

	if (profile.isErr()) {
		terminal.error('Error getting profile:', profile.error);
		throw error(500, 'Internal Server Error');
	}

	return {
		user: userData?.user || null,
		cookies: event.cookies.getAll(),
		is_mentor: is_mentor.value,
		is_student: is_student.value,
		is_viewer: is_viewer.value,
		profile: profile.value?.raw || null,
		env: env_data
	};
};
