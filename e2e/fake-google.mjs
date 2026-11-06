// A fake Google for the end-to-end tests (section 8 of the plan): the authorization page, where a
// test types the account it signs in with, and the token endpoint, which checks the PKCE verifier
// and returns an ID token. Playwright starts it in the network of the app container, so the
// browser and the server of the app both reach it at http://localhost:9100.
import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';

const PORT = 9100;
// compose.e2e.yaml gives the app the same client.
const CLIENT_ID = 'e2e-client';
const CLIENT_SECRET = 'e2e-secret';
const CALLBACK = 'https://localhost/connect/google/check';

const codes = new Map();

const base64Url = (data) => Buffer.from(data).toString('base64url');
const escape = (text) => String(text).replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

function idToken({ sub, name, email }) {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: 'https://accounts.google.com',
    azp: CLIENT_ID,
    aud: CLIENT_ID,
    sub,
    email,
    email_verified: true,
    name,
    iat: now,
    exp: now + 3600,
  };

  return `${base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64Url(JSON.stringify(claims))}.${base64Url('signature')}`;
}

function send(response, status, body, type = 'application/json') {
  response.writeHead(status, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store' });
  response.end(type === 'application/json' ? JSON.stringify(body) : body);
}

function redirect(response, location) {
  response.writeHead(302, { Location: location });
  response.end();
}

async function form(request) {
  let body = '';

  for await (const chunk of request) {
    body += chunk;
  }

  return new URLSearchParams(body);
}

// The page where a person picks the account: the test types it in.
function authorize(url, response) {
  const query = url.searchParams;

  if (
    query.get('client_id') !== CLIENT_ID ||
    query.get('redirect_uri') !== CALLBACK ||
    query.get('response_type') !== 'code' ||
    query.get('scope') !== 'openid email profile' ||
    query.get('code_challenge_method') !== 'S256' ||
    !query.get('state') ||
    !query.get('code_challenge')
  ) {
    send(response, 400, '<h1>Bad authorization request</h1>', 'text/html');

    return;
  }

  const hidden = ['state', 'code_challenge']
    .map((name) => `<input type="hidden" name="${name}" value="${escape(query.get(name))}">`)
    .join('');

  send(
    response,
    200,
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Fake Google</title></head><body>
<main><h1>Choose an account</h1><form method="post" action="/authorize">${hidden}
<label>Subject <input name="sub" required></label>
<label>Name <input name="name"></label>
<label>Email <input name="email"></label>
<button name="action" value="allow">Continue</button>
<button name="action" value="deny" formnovalidate>Cancel</button>
</form></main></body></html>`,
    'text/html',
  );
}

async function answer(request, response) {
  const fields = await form(request);
  const back = new URL(CALLBACK);
  back.searchParams.set('state', fields.get('state') ?? '');

  if (fields.get('action') === 'deny') {
    back.searchParams.set('error', 'access_denied');
  } else {
    const code = randomBytes(16).toString('hex');
    codes.set(code, {
      challenge: fields.get('code_challenge'),
      account: { sub: fields.get('sub'), name: fields.get('name') || null, email: fields.get('email') || null },
    });
    back.searchParams.set('code', code);
  }

  redirect(response, back.toString());
}

// The server of the app trades the code for the identity, proving it holds the verifier.
async function token(request, response) {
  const fields = await form(request);
  const grant = codes.get(fields.get('code'));
  codes.delete(fields.get('code'));

  if (
    grant === undefined ||
    fields.get('grant_type') !== 'authorization_code' ||
    fields.get('client_id') !== CLIENT_ID ||
    fields.get('client_secret') !== CLIENT_SECRET ||
    fields.get('redirect_uri') !== CALLBACK ||
    createHash('sha256').update(fields.get('code_verifier') ?? '').digest('base64url') !== grant.challenge
  ) {
    send(response, 400, { error: 'invalid_grant' });

    return;
  }

  send(response, 200, {
    access_token: randomBytes(16).toString('hex'),
    expires_in: 3599,
    token_type: 'Bearer',
    scope: 'openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
    id_token: idToken(grant.account),
  });
}

createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://localhost:${PORT}`);
  const route = `${request.method} ${url.pathname}`;

  if (route === 'GET /health') {
    send(response, 200, { ok: true });
  } else if (route === 'GET /authorize') {
    authorize(url, response);
  } else if (route === 'POST /authorize') {
    void answer(request, response);
  } else if (route === 'POST /token') {
    void token(request, response);
  } else {
    send(response, 404, { error: 'not_found' });
  }
  // Every address of the host, so «localhost» works over IPv4 and IPv6 alike.
}).listen(PORT);
