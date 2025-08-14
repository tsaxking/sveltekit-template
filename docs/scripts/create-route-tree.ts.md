# create-route-tree.ts

This generates a file at `./private/route-tree.pages` file which informs the backend at runtime what the valid urls are.

In doing so, you can also easily copy routes to the neighboring `blocked.pages` file or `ip-limited.pages` file to enable their functionality. View [analytics.ts](src/lib/server/structs/analytics.ts) and [limiting.ts](src/lib/server/structs/limiting.ts) for more information on this.
