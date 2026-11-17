# SlotPick frontend

Customer opens a link from SMS/push: https://yourdomain/d/<token>
They have ~10 min to pick a delivery slot.

## Run web
cd web && npm install && npm start      (mock data is used until REACT_APP_API_URL is set)
Try: http://localhost:3000/#/d/demo

## Run mobile
cd mobile && npm install && npx expo start

## Backend API

The API is in `../apps/api`. Copy `.env.example` to `.env`, configure MongoDB
and the admin credentials, then run `npm install` and `npm start` from that
directory. The configured admin is created on first startup and is not reset
on later starts.

Set the API base URL with `REACT_APP_API_URL` (web) or `EXPO_PUBLIC_API_URL`
(mobile). The delivery-selection API contract is:

- `GET /api/deliveries/:token` returns `{ orderId, address, selectionExpiresAt, slots:[{id,date,start,end,available}] }`.
- `POST /api/deliveries/:token/slot` with `{ "slotId": "..." }` books the slot, returning `{ slotId, date, start, end }`.
- Invalid links return 404, expired selection windows return 410, and a slot that is no longer available returns 409.

### Postman quick test

Use `http://localhost:4000` as the base URL (or the configured `PORT`):

1. `POST /api/auth/register` with JSON `{ "name": "Test Customer", "email": "customer@example.com", "password": "customer-pass-123" }`. Public registration always creates a `customer`; it cannot set its own role.
2. `POST /api/auth/login` with the same email/password. Copy the returned `token`.
3. `GET /api/auth/me` with `Authorization: Bearer <token>`.
4. Log in using the configured admin email/password and use its token to `POST /api/admin/agents` with `{ "name": "Test Agent", "email": "agent@example.com", "password": "agent-pass-123" }`.
5. As admin, `POST /api/admin/deliveries` with JSON like:

   ```json
   {
     "orderId": "ORD-1001",
     "address": "12 Station Road",
     "selectionMinutes": 10,
     "slots": [
       { "date": "2027-01-15", "start": "09:00", "end": "11:00", "capacity": 4 },
       { "date": "2027-01-15", "start": "11:00", "end": "13:00", "capacity": 4 }
     ]
   }
   ```

   Set the admin bearer token. Copy the returned `token` and a slot `id`.
   Slots with the same date and times are shared and capacity is set the first
   time that slot is created.
6. `GET /api/deliveries/<delivery-token>`, then `POST /api/deliveries/<delivery-token>/slot` with `{ "slotId": "<slot-id>" }`. A delivery link can only schedule one slot.
7. Agent tokens can call `GET /api/agent/deliveries`; customer tokens can call `GET /api/customer/deliveries`. Both return only records assigned to that account.
