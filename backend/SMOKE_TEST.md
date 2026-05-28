## EzSakay smoke test (end-to-end)

### Backend + DB
- Start Postgres + API:

```bash
docker compose up --build
```

- Open API docs: `http://localhost:8000/docs`
- Confirm DB health: `GET /health` returns `db_connected: true`

### Passenger (mobile)
- **Send OTP**: `POST /auth/send-otp/` with `{ "phone_number": "+63..." }`
- **Verify OTP**: `POST /auth/verify-otp/`
- **Create account** (if needed): `POST /auth/create-account/`
- **Create MPIN**: `POST /auth/create-mpin/` -> saves passenger token
- **Wallet**: `GET /wallet/me`
- **Topup**: `POST /topup/` (auth required) -> balance increases
- **Schedules**: `GET /schedules?route_id=1&service_date=YYYY-MM-DD`
- **Booking**: `POST /bookings` -> ticket created + seats reserved + balance deducted (wallet)
- **Ticket QR**: `POST /tickets/{id}/qr`

### Conductor (mobile)
- Login: `POST /conductor/login`
- Verify MPIN: `POST /conductor/verify-mpin`
- Scan ticket: `POST /tickets/scan`
- Accept/reject:
  - `POST /tickets/accept`
  - `POST /tickets/reject`

### Admin (web)
- Login: `POST /auth/login`
- Dashboard: `GET /stats/dashboard`
- Users/Conductors/Topups/Transactions list loads without Supabase
- Reports:
  - `GET /reports/rides/daily?from=YYYY-MM-DD&to=YYYY-MM-DD`
  - `GET /reports/export.csv?from=...&to=...`

