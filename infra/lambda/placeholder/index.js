// Placeholder for the Java Lambda (Phase 1.4).
// Same shape as Evently: route table -> one handler per use case.

const routes = {
  'POST /v1/users/register': registerUser,
  'GET /v1/users/profile': getUserProfile,
  'PUT /v1/users/profile': updateUserProfile,
};

exports.handler = async (event) => {
  const routeKey = event.httpMethod + ' ' + event.resource;
  console.log(JSON.stringify({ routeKey, requestId: event.requestContext && event.requestContext.requestId }));

  const route = routes[routeKey];
  if (!route) {
    return problem(404, 'Route.NotFound', 'No handler for ' + routeKey);
  }

  try {
    return await route(event);
  } catch (err) {
    console.error(err);
    return problem(500, 'Server.Error', 'Unexpected error');
  }
};

// Evently: RegisterUser -> 200 + new id
async function registerUser(event) {
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return problem(400, 'Request.InvalidJson', 'Body must be valid JSON');
  }
  return json(200, { id: crypto.randomUUID(), email: body.email, table: process.env.TABLE_NAME });
}

// Evently: GetUserProfile -> 200 + UserResponse(Id, Email, FirstName, LastName)
async function getUserProfile(event) {
  return json(200, {
    id: currentUserId(event),
    email: 'placeholder@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
  });
}

// Evently: UpdateUserProfile -> 204 No Content
async function updateUserProfile(event) {
  return { statusCode: 204, body: '' };
}

// Evently: claims.GetUserId(). Filled by the Cognito authorizer in a later phase.
function currentUserId(event) {
  const claims = event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.claims;
  return (claims && claims.sub) || 'no-auth-yet';
}

function json(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

// Evently: ApiResults.Problem -> RFC 7807 Problem Details
function problem(status, title, detail) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/problem+json' },
    body: JSON.stringify({ type: 'about:blank', title, status, detail }),
  };
}
