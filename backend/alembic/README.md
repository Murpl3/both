## Alembic migrations (Postgres)

This backend ships with Alembic so the database schema is reproducible for deployment.

### Quick start

- Set `DATABASE_URL` (Postgres recommended).
- From the `backend/` directory:

```bash
alembic -c alembic.ini upgrade head
```

### Notes

- The legacy `backend/migrations/*.sql` files are Supabase-editor oriented and are not used for Postgres deployments.
- Seed routes/schedules using `seed.seed_default_route(db)` from an admin/ops script.

