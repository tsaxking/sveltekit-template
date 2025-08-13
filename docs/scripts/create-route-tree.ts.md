# create-route-tree.ts

Route tree generation utility that scans the SvelteKit routes directory and creates a structured list of all available routes. This script processes dynamic routes and generates a route map for navigation and development purposes.

## File Overview

This script analyzes the `src/routes` directory structure and generates a route tree file that maps all available routes in the application. It handles SvelteKit's dynamic routing patterns and converts them to a standardized format for use by other parts of the system.

## Exported Functions

### `default` (main function)
```ts
export default async () => Promise<void>
```

**Description:** Scans the routes directory and generates a route tree file with all available routes.

**Process:**
1. Creates the `private/` directory if it doesn't exist
2. Scans the `src/routes` directory structure using `fileTree`
3. Processes each file path to extract route patterns
4. Converts SvelteKit dynamic route syntax to standardized patterns:
   - `[param]` becomes `*` (single parameter)
   - `[...rest]` becomes `**` (rest parameters)
5. Writes the sorted route list to `private/route-tree.pages`

**Returns:** Promise that resolves when the route tree file is created

**Output File:** `private/route-tree.pages` - Contains sorted list of route patterns, one per line

**Example:**
```ts
import createRouteTree from './create-route-tree.ts';
await createRouteTree(); // Generates route tree from src/routes
```

**Route Pattern Examples:**
- `/users/[id]` → `/users/*`
- `/api/[...path]` → `/api/**`
- `/dashboard` → `/dashboard`
