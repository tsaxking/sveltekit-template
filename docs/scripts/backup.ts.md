# backup.ts

Database backup utility that creates compressed backups of all database structures with timestamped filenames. This script handles the entire backup process including prompting for backup names, creating individual struct backups, and compressing them into a single ZIP file.

## File Overview

This script provides automated database backup functionality for the application. It connects to the database, backs up all structs, prompts the user for a backup name, and creates a compressed archive in the `backups/` directory.

## Exported Functions

### `BACKUP_DIR`
```ts
export const BACKUP_DIR = path.join(process.cwd(), 'backups');
```

**Description:** Constant defining the backup directory path where all backup files are stored.

### `default` (main function)
```ts
export default async () => Promise<void>
```

**Description:** Main backup function that orchestrates the entire backup process.

**Process:**
1. Creates the backup directory if it doesn't exist
2. Opens and builds all database structs
3. Prompts user for backup name
4. Creates individual struct backups
5. Compresses all backup files into a ZIP archive
6. Cleans up temporary files

**Returns:** Promise that resolves when backup is complete

**Example:**
```ts
import backup from './backup.ts';
await backup(); // Prompts for name and creates timestamped backup
```
