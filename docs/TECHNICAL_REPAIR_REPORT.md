# EZSakay Technical Repair Report (Mobile + Admin Sync)

## Summary
This document captures the fixes applied to align the **EzSakayApp** mobile app and **EZSakay Admin** web panel around a shared departure schedule contract and to prevent “silent failures” in Admin UI.

## Identified issues
- **DTO mismatch**: mobile relied on backend `/schedules` objects, while Admin did not have a first-class schedules module or shared schedule typing.
- **Admin silent failures**: errors were often logged only to console, leaving pages without a user-visible error state.
- **UI mismatches**: Admin and mobile schedule/passenger screens diverged in visual hierarchy and responsiveness.

## Fixes applied
### 1) Schedule object standardization
- Mobile schedule mapping in `screens/DepartureScheduleScreen.js` now preserves canonical backend fields:
  - `id`, `route_id`, `departure_time`, `capacity`, `remaining_seats`
- UI-only fields (e.g. AM/PM label, seat display string) are derived from canonical fields to prevent inconsistencies.

### 2) Admin schedule management (backend + UI)
The shared backend (`backend/routes_api.py`) now exposes admin-only schedule CRUD endpoints:
- `POST /admin/schedules`
- `PUT /admin/schedules/{schedule_id}`
- `POST /admin/schedules/{schedule_id}/deactivate`

Admin uses these endpoints to create/edit/deactivate schedule times and capacity while keeping the public `/schedules` view consistent for mobile.

## Recommended environment setup
### Backend
Default backend port is **8000** (see `backend/start_server.bat`), so your clients should point to `http://<ip>:8000`.

### Mobile (Expo)
Use one of:
- Set `EXPO_PUBLIC_API_URL=http://YOUR_BACKEND_IP:8000` (preferred for builds), or
- Update `LOCAL_DEV_URL` in `config.js` to `http://YOUR_BACKEND_IP:8000`

### Admin (Vite)
Set `VITE_API_URL=http://YOUR_BACKEND_IP:8000` in `EZSakay Admin/.env.local`.

## Test plan
- Mobile: verify Departure Schedules loads and displays correct remaining seats for each time bucket.
- Admin: verify Schedules page can create/edit/deactivate schedules and reflects seat availability for a chosen `service_date`.

