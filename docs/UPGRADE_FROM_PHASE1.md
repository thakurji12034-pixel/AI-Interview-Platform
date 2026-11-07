# Database Upgrade Guide from Phase 1 to Current Schema

This document details the exact, tested upgrade procedure for migrating an existing production database from the Phase 1 schema to newer releases.

---

## 1. Safety & Pre-requisites

Always generate a timestamped backup prior to running any schema migrations in production:

```bash
docker compose exec db mysqldump -u interview_app -p"${DB_PASSWORD}" interview_platform | gzip > backup_pre_upgrade_$(date +%Y%m%d_%H%M%S).sql.gz
```

---

## 2. Migration Execution Flow

All database schema evolutions are managed idempotently using Umzug:

```bash
# Apply all pending migrations
docker compose exec server npm run db:migrate

# Check status of applied and pending migrations
docker compose exec server npm run db:migrate:status
```

---

## 3. Post-Upgrade Verification Checklist

Verify that tables and indexes are intact after migration:

```bash
# Verify tables exist
docker compose exec db mysql -u interview_app -p"${DB_PASSWORD}" -e "SHOW TABLES IN interview_platform;"

# Verify row counts are preserved
docker compose exec db mysql -u interview_app -p"${DB_PASSWORD}" -e "SELECT COUNT(*) FROM interview_platform.users; SELECT COUNT(*) FROM interview_platform.interviews;"

# Verify Phase 5 submissions table
docker compose exec db mysql -u interview_app -p"${DB_PASSWORD}" -e "DESCRIBE interview_platform.submissions;"
```

---

## 4. Rollback Procedure (If Necessary)

If a migration fails or must be rolled back:

```bash
# Revert the latest migration
docker compose exec server npm run db:migrate:undo

# In catastrophic situations, restore from the pre-upgrade SQL dump
gunzip < backup_pre_upgrade_*.sql.gz | docker compose exec -T db mysql -u interview_app -p"${DB_PASSWORD}" interview_platform
```

