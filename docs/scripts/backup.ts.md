# backup.ts

With this script, you can create a backup of the database. It will prompt you for a name for the backup file, which will be saved in the `backups` directory. The script currently uses a simple json file to store the backup, but it will eventually be able to have other types of backups, such as SQL dumps or streamable formats.

This script may take some time depending on the size of your database, so please be patient.

## Future Improvements

- Support for different backup formats (e.g., SQL dumps, streamable formats).
- Progress bars or indicators for long-running operations.
