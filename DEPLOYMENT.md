# SlotPick Deployment

This guide deploys the existing web frontend to Vercel and the Node API to
Render, with MongoDB Atlas as the database. It does not seed demo data or expose
any application secrets to the frontend.

## 1. Prepare MongoDB Atlas

1. Use a production Atlas project/cluster and create a database user with only
   the privileges the application needs for its database.
2. Add the Render service's outbound IP addresses to Atlas Network Access when
   your Render plan provides stable outbound addresses. If an allow-all rule is
   unavoidable, use a strong unique database password and restrict the database
   user's permissions.
3. Copy the Atlas SRV connection string. Replace its database user/password
   placeholders, URL-encode special characters in the password, and include the
   application database name in the path.
4. Do not commit the URI or put it in a frontend environment variable.

## 2. Deploy the API to Render

1. Push the repository to the Git provider connected to Render.
2. In Render, create a **Blueprint** from the repository. The root
   [`render.yaml`](./render.yaml) creates the `slotpick-api` web service with
   `apps/api` as its root, `npm ci` as its build command, `npm start` as its
   start command, and `/health` as its health check. The API declares a
   minimum Node version of 20.19.0 for Mongoose.
3. Provide the prompted secret values:
   - `MONGODB_URI`: the Atlas URI.
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD`: production admin credentials. The
     password must be 8–72 characters.
   - `CORS_ORIGIN`: the exact Vercel origin, for example
     `https://slotpick-web.vercel.app`. Add multiple origins as a comma-separated
     list, with no paths or trailing slashes.
4. Render generates `JWT_SECRET` from the Blueprint. Keep it private and do not
   change it casually; replacing it invalidates issued tokens.
5. Keep `NODE_ENV=production`. Render supplies `PORT`; do not hard-code it.
   `ADMIN_NAME` and `JWT_EXPIRES_IN` have non-secret Blueprint defaults.
6. Wait for the service to deploy and check
   `https://<render-service>.onrender.com/health`. It should return HTTP 200
   with `"status":"ok"` and `"db":"connected"`.

The API validates its required environment at startup: `MONGODB_URI`,
`JWT_SECRET` (at least 32 characters), `ADMIN_EMAIL`, and `ADMIN_PASSWORD`.
Production startup also requires a non-wildcard `CORS_ORIGIN`. On first startup,
the configured admin is created if absent; an existing account's password is
not reset.

## 3. Deploy the web frontend to Vercel

1. Import the same repository into Vercel.
2. Set **Root Directory** to `slotpick/web`.
3. Use the `Other` framework preset if Vercel does not detect one. The included
   [`vercel.json`](./slotpick/web/vercel.json) specifies `npm ci`,
   `npm run build`, the `dist` output directory, and an SPA rewrite so direct
   delivery-link paths load the app.
4. Add this environment variable for **Production** and any Preview
   environments that will be tested:
   - `REACT_APP_API_URL=https://<render-service>.onrender.com`
5. Deploy. The API URL is embedded at build time, so redeploy after changing
   this variable or the Render service URL.
6. Copy the assigned Vercel production domain and add it to Render's
   `CORS_ORIGIN`. Include any custom domain the frontend will use. Redeploy the
   API after changing the value.

Only `REACT_APP_API_URL` belongs in Vercel. Never place `MONGODB_URI`,
`JWT_SECRET`, or admin credentials in frontend settings: frontend build
variables are public in the shipped bundle.

## 4. Local environment variables

For local API development, copy `apps/api/.env.example` to `apps/api/.env`.
`PORT=4000` and `CORS_ORIGIN=http://localhost:3000` are local-development
settings; Render supplies its own port and should use the deployed Vercel
origin. The repository ignores `.env` files.

For a local web build, set the API URL in the shell before starting/building the
frontend:

```powershell
Set-Location .\slotpick\web
$env:REACT_APP_API_URL = 'http://localhost:4000'
npm ci
npm start
```

In Vercel, set `REACT_APP_API_URL` to the Render HTTPS URL instead. The frontend
reports a configuration error if this variable is missing; it has no localhost
fallback.

## 5. Production smoke test

1. Confirm the Vercel site loads over HTTPS and direct navigation to
   `/d/<delivery-token>` serves the SPA.
2. Call the Render `/health` endpoint and confirm MongoDB is connected.
3. Register a customer, sign in, refresh the page, and confirm the session is
   restored through `/api/auth/me`.
4. Use the admin account to create a delivery linked to the customer and an
   assigned agent. Confirm the customer dashboard lists it.
5. Book a slot, then sign in as the assigned agent and advance the delivery
   through `scheduled` → `out-for-delivery` → `delivered`.
6. Confirm the customer's dashboard reflects the status change within its
   15-second refresh interval.
7. Verify an unauthenticated request to protected routes is rejected and an
   agent cannot update a delivery assigned to another agent.

Do not run `npm run seed-demo` in production; the script intentionally refuses
to run when `NODE_ENV=production`.

## Production checklist

- [ ] Rotate any credentials that were exposed during development; use unique
      production values.
- [ ] Confirm `.env` files and secrets are not committed.
- [ ] Use a least-privilege Atlas database user and an appropriate network
      access rule.
- [ ] Set Render `MONGODB_URI`, generated `JWT_SECRET`, `ADMIN_EMAIL`,
      `ADMIN_PASSWORD`, and exact `CORS_ORIGIN`.
- [ ] Confirm `NODE_ENV=production` and let Render supply `PORT`.
- [ ] Set Vercel `REACT_APP_API_URL` to the Render HTTPS origin in each
      deployment environment, then redeploy.
- [ ] Add all active Vercel/custom frontend origins to `CORS_ORIGIN`; do not
      use `*` in production.
- [ ] Verify `/health`, authentication, customer delivery history, slot
      booking, agent status transitions, and customer status refresh.
- [ ] Confirm the Vercel SPA rewrite and custom domains use HTTPS.
- [ ] Keep production demo seeding disabled and monitor Render logs for startup
      or database errors.
