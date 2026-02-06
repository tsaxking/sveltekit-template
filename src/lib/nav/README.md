# src/lib/nav

Originally `src/lib/imports/*`, this directory contains initialization code for the left navigation menu in the dashboard. Each file corresponds to a different user role or section of the dashboard, such as `admin.ts`, `user.ts`, etc.

## Usage

Import and generate the navbar. If there are sections of the same name, the last one imported will overwrite the previous one.

```ts
import { Navbar } from '$lib/model/navbar';

export default () => {
	// Group of links
	Navbar.addSection({
		name: 'Something',
		links: [
			{
				name: 'My Link',
				href: '/my-link',
				icon: {
					type: 'material-icons',
					name: 'link'
				}
			}
		]
	});
};
```
