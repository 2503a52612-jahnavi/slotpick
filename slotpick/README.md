# SlotPick frontend

For Vercel and Render production deployment, see
[DEPLOYMENT.md](../DEPLOYMENT.md).

Customer opens a link from SMS/push: https://yourdomain/d/<token>
They have ~10 min to pick a delivery slot.

## Run web

Start the backend in one PowerShell terminal:

```powershell
Set-Location .\apps\api
npm start
```

In another terminal, run the frontend from the repository root:

```powershell
Set-Location .\slotpick\web
$env:REACT_APP_API_URL = 'http://localhost:4000'
npm start
```

The frontend requires `REACT_APP_API_URL` to be set at build time. For local
development use `http://localhost:4000`; no mock authentication or delivery
data is used.

Open `http://localhost:3000/#/register` to create a customer account, then
`http://localhost:3000/#/login` to sign in. The session token is stored in
browser local storage and verified through `/api/auth/me` after refresh.
The root URL opens the login page for signed-out users; `#/account` opens the
role-specific account view for signed-in users.
The customer view loads delivery history from `/api/customer/deliveries` and
shows live slot availability. Selecting a slot books it through the
authenticated customer delivery endpoint and refreshes the history. The
customer dashboard refreshes delivery statuses every 15 seconds. Delivery
agents see an Agent Dashboard with their assigned deliveries and can advance
each delivery through its valid status transitions.

To test delivery selection, create a delivery through the admin API as described
in the Postman steps below, then open
`http://localhost:3000/#/d/<delivery-token>`.

## Run mobile
cd mobile && npm install && npx expo start

## Backend API

The API is in `../apps/api`. Copy `.env.example` to `.env`, configure MongoDB
and the admin credentials, then run `npm install` and `npm start` from that
directory. The configured admin is created on first startup and is not reset
on later starts.

To add development delivery data for the customer `jahnavi@test.com`, run
`npm run seed-demo` from `apps/api`. This creates or reuses a demo agent, adds
three available slots, and links a pending demo delivery to the customer. It
refuses to run when `NODE_ENV=production`. Set `DEMO_AGENT_EMAIL` and
`DEMO_AGENT_PASSWORD` before running if you want to use the demo agent for
sign-in; otherwise its password is generated randomly.

Set the API base URL with `REACT_APP_API_URL` (web) or `EXPO_PUBLIC_API_URL`
(mobile). The delivery-selection API contract is:

- `GET /api/deliveries/:token` returns `{ orderId, address, selectionExpiresAt, slots:[{id,date,start,end,available}] }`.
- `POST /api/deliveries/:token/slot` with `{ "slotId": "..." }` books the slot, returning `{ slotId, date, start, end }`.
- Invalid links return 404, expired selection windows return 410, and a slot that is no longer available returns 409.

### Delivery agent status API

Both routes require `Authorization: Bearer <agent-jwt>` and only operate on
deliveries assigned to the authenticated agent.

- `GET /api/agent/deliveries` returns that agent's assigned deliveries.
- `PATCH /api/agent/deliveries/<delivery-id>/status` accepts JSON with status
  `scheduled`, `out-for-delivery`, or `delivered` and returns
  `{ "delivery": { "_id": "<id>", "status": "<new status>", ... } }`.
- Valid progression is `scheduled` → `out-for-delivery` → `delivered`.
  `pending` → `scheduled` is allowed only if the delivery already has a
  selected slot. Repeating the current status is idempotent; other transitions
  return `409`. Invalid status values return `400`; unassigned deliveries
  return `404`.

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
6. To book from the customer dashboard, create the delivery with the customer's `_id` as `customerId`, then sign in as that customer and select one of the slots in the dashboard. This calls `POST /api/customer/deliveries/<delivery-id>/slot` with `{ "slotId": "<slot-id>" }`.
7. Alternatively, `GET /api/deliveries/<delivery-token>`, then `POST /api/deliveries/<delivery-token>/slot` with `{ "slotId": "<slot-id>" }`. A delivery can only schedule one slot.
8. Agent tokens can call `GET /api/agent/deliveries`; customer tokens can call `GET /api/customer/deliveries`. Both return only records assigned to that account.
9. Delivery agents update an assigned delivery with `PATCH /api/agent/deliveries/<delivery-id>/status` and JSON `{ "status": "out-for-delivery" }`, then `{ "status": "delivered" }`. Include the agent JWT. The valid progression is `scheduled` → `out-for-delivery` → `delivered`; a pending delivery can only become scheduled if it already has a selected slot. Other transitions return `409`.

### Agent dashboard test

1. Create a test agent through `POST /api/admin/agents` with a development-only password, or set `DEMO_AGENT_PASSWORD` before seeding demo data.
2. Create/assign a delivery to that agent and a customer. Have the customer select a slot so the delivery is `scheduled`.
3. Sign in as the agent at `http://localhost:3000/#/login`. The role-protected account view is the Agent Dashboard.
4. Click **Mark out for delivery**, then **Mark delivered**. Attempting to skip a step through Postman should return `409`.
5. Keep the customer's account open; its delivery status refreshes from the API every 15 seconds.
