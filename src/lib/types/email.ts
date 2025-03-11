export type Email = {
	'forgot-password': {
		link: string;
		supportEmail: string;
	};
	'new-user': {
		username: string;
		verification: string;
	};
	test: {
		something: string;
	};
};
