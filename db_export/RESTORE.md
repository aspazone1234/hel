# Restoring the MongoDB snapshot

This folder is a full `mongodump` of the `test_database` used by the Shrimad Bhagavat
Katha 2026 / Swayamsevak Portal app. When you move this codebase to a fresh
environment, restore it with:

```bash
mongorestore --db test_database /app/db_export/test_database/ --drop
```

The `--drop` flag ensures any stale data in the target is cleared before restore.

Seeded super admin (from code): username `superashwini` / password `supersebhiupper123`.
