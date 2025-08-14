# limiting.ts

The Limiting structs are designed for rate-limiting, blocking, and ip page rules.

It has 5 structs:

### PageRuleset

Page Rulesets are geared towards limiting pages specified in `./private/ip-limited.pages` to specific ip addresses.

This would be useful if you only want people to access pages if they are connected to a specific network.

You can use the CLI tool with `pnpm cli` to manage these rulesets.

### BlockedIPs

As the name suggests, this struct stores the information for all blocked ip addresses. Any user with an ip address in this struct will not be able to access any of the site.

### BlockedSessions

Similar to BlockedIPs, this blocks sessions (given by a cookie), this way if a user's network has changed, the block will persist.

### BlockedFingerprints

When a user opens the site, a fingerprint is generated. This will prevent any user with this fingerprint to access the site.

### BlockedAccounts

Any account stored in here will be blocked.

## Future Features

- If an account has been blocked, I want to also block their session and fingerprint.
