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
		service: string;
		link: string;
		linkText: string;
	};
};
