# Backup and restore

Use provider-managed PostgreSQL backups/PITR for the complete database, including profiles and request history. Verify the provider's separate policy for restoring Auth users and configuration; workspace JSON exports do not contain those accounts. Schedule encrypted backups and establish the business's acceptable recovery point and recovery time before launch.

The application also includes a consistent workspace export:

```sh
npm run db:backup -- /protected/location/workspace.backup.json
```

Use administrator `DATABASE_URL`. The command uses a repeatable-read transaction and exports the workspace, migration checksums and request retry history together. It refuses to overwrite a file. Store the result encrypted with restricted access; it contains customer and financial data. Exports are not full database or Auth backups.

To restore an export to a database with matching migrations and the referenced profiles already present, stop all application writers, take a fresh pre-restore backup, and run:

```sh
npm run db:restore -- /protected/location/workspace.backup.json --confirm-replace
```

Restore validates migration checksums and replaces workspace data plus retry history in one transaction. Failure rolls the transaction back. It increases the current revision so old clients cannot overwrite the restored workspace. Restart the server, require staff to reload/sign in, and reconcile financial balances with external payment records before resuming operations. Payments made after the backup will need explicit reconciliation; restoring cannot recover records absent from the backup.

Local PostgreSQL integration tests verify that backup/restore retains the saved workspace and request retry results. This does not validate the hosting provider's PITR or Auth recovery procedure; run that drill in staging.
