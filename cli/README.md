# CLI

This is a command-line interface (CLI) for interacting with the application. It provides various commands to perform tasks such as managing configurations, running processes, and retrieving information.

## Usage

To use the CLI, run the following command in your terminal:

```sh
pnpm cli
```

## Default Capabilities

The CLI ships with the following default capabilities:

- `Server Controller`: Customizable to manage your app's operations.
- `Account Controller`: Verify, create, list, and manage user accounts. You can create system admins here.
- `Page Limiting`: Control blocked pages and limit access by ip or user account.

## Customization

You can customize the CLI by adding commands under the `Server Controller`, they are broken down into 2 categories:

- `Folder`: A collection of commands that the user can select through a menu.
- `Action`: A single command that runs immediately.

```ts
import { Folder } from './utils';
export default new Folder('Custom Commands', 'Do what you would like!', '⚙️', [
	new Action('my-command', 'This is my custom command', '🚀', () => {
		console.log('Running my custom command!');
	})
]);
```

## Utils

The CLI provides several utility functions to help you create custom commands easily. You can find these utilities in the `utils` file.

```ts
import {
	// Prompt the user for input
	prompt,
	// Validated prompt with custom validation - repeat until valid
	repeatPrompt,
	// Select from a list of options
	select,
	// Select multiple options from a list
	multiSelect,
	// Confirm action with yes/no
	confirm,
	// Prompt for a secure password
	password,
	// Uses fuzzy searching to select from a list
	search,
	// Displays a table of data and allows selection (single)
	selectFromTable,
	// Displays a table of data
	viewTable
} from './utils';
```
