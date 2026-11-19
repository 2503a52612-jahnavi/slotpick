const DEMO_TEAM_ACCOUNTS = require('./demoTeamAccounts');

const apiBaseUrl = (process.argv[2] || 'http://localhost:4000').replace(/\/+$/, '');

async function checkDemoTeamLogin() {
  let agentToken;
  for (const [role, account] of Object.entries(DEMO_TEAM_ACCOUNTS)) {
    const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: account.email,
        password: account.password,
      }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.token || result.user?.role !== role) {
      throw new Error(`${role} login did not return a token and the expected role`);
    }
    if (role === 'agent') agentToken = result.token;
  }

  const deliveriesResponse = await fetch(`${apiBaseUrl}/api/agent/deliveries`, {
    headers: { Authorization: `Bearer ${agentToken}` },
  });
  const deliveriesResult = await deliveriesResponse.json().catch(() => ({}));
  const expectedOrderIds = ['ID_101', 'ID_102', 'ID_103', 'ID_104', 'ID_105'];
  const assignedOrderIds = new Set(
    (Array.isArray(deliveriesResult.deliveries) ? deliveriesResult.deliveries : [])
      .map((delivery) => delivery.orderId)
  );
  if (
    !deliveriesResponse.ok ||
    expectedOrderIds.some((orderId) => !assignedOrderIds.has(orderId))
  ) {
    throw new Error('Agent delivery list is missing one or more demo orders');
  }

  console.log('Demo team login and assigned-delivery checks passed.');
}

checkDemoTeamLogin().catch(() => {
  console.error('Demo team login check failed. Confirm the API is running and seeded.');
  process.exitCode = 1;
});
