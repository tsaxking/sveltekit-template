# enable-timestamp-schema.ts

Running this script will convert all tables' "created" "updated" and "vhCreated" columns from ISO strings into timestamps for the new struct system.

It will not cause data loss as it caches the data before it does any column migration.

## Usage

If you want to add more columns into this script, run

```sh
pnpm script enable-timestamp-schema table_name:column_name table_name_2:column_name ...
```

Be sure you only do this with columns that you know should be a date format. If you don't it's possible you'll get Invalid Date. If this is the case, it will default to the current timestamp.
