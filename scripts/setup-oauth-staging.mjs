#!/usr/bin/env node
/**
 * Interactive walkthrough for wiring OAuth on a fresh environment.
 *
 * Asks for the inputs (staging DATABASE_URL, admin session cookie) one
 * at a time, runs each command, and stops on the first failure.
 *
 * Defaults to staging. For prod, run with:
 *   ENV=production node scripts/setup-oauth-staging.mjs
 * (prod also needs an `--env production` on the wrangler-secret calls;
 * the script wires that up automatically.)
 *
 * The script is idempotent in places that matter:
 *   - pnpm db:migrate is no-op on already-applied migrations.
 *   - wrangler secret put overwrites.
 * Re-registering the MCP OAuth client would create a duplicate row —
 * the script skips that step if existing secrets are detected on the
 * worker.
 */

import { spawn, spawnSync } from 'node:child_process';

const ENV = process.env.ENV ?? 'staging';
const API_BASE_URL =
  process.env.API_BASE_URL ??
  (ENV === 'production' ? 'https://api.vite.in' : 'https://api-staging.vite.in');

// ---------- pretty output ----------

const c = {
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};

function header(n, title) {
  console.log('\n' + c.bold(c.cyan(`━━━ Step ${String(n)} / 5: ${title} ━━━`)));
}

function note(s) {
  console.log(c.dim(s));
}

function ok(s) {
  console.log(c.green(`✓ ${s}`));
}

function fail(s) {
  console.log(c.red(`✗ ${s}`));
}

// ---------- input ----------

/**
 * Read one line of input. With `hide: true`, echoes `*` per character
 * (raw mode); without it, the terminal's cooked mode echoes normally.
 */
function ask(question, { hide = false } = {}) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const stdin = process.stdin;

    if (hide) stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let buf = '';
    const onData = (chunk) => {
      for (const ch of chunk) {
        // Ctrl+C
        if (ch === '\x03') {
          process.stdout.write('\n');
          process.exit(130);
        }
        // Enter
        if (ch === '\r' || ch === '\n') {
          if (hide) stdin.setRawMode?.(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          resolve(buf.trim());
          return;
        }
        // Backspace (raw only)
        if (hide && (ch === '\x7f' || ch === '\b')) {
          if (buf.length > 0) {
            buf = buf.slice(0, -1);
            process.stdout.write('\b \b');
          }
          continue;
        }
        buf += ch;
        if (hide) process.stdout.write('*');
        // In cooked mode the terminal echoes for us — we don't write.
      }
    };
    stdin.on('data', onData);
  });
}

async function confirm(question = 'Press Enter to continue (or Ctrl+C to abort)…') {
  await ask(c.dim(question));
}

// ---------- command runners ----------

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (res.status !== 0) {
    fail(`${cmd} ${args.join(' ')} exited with ${String(res.status)}`);
    process.exit(res.status ?? 1);
  }
}

function runCapture(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  return { status: res.status ?? 0, stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
}

/**
 * `wrangler secret put` reads the value from stdin when not run on a
 * TTY. Pipe the value in via `input:` and inherit stdout/stderr so the
 * user sees the wrangler confirmation.
 */
function setWranglerSecret(name, value) {
  const args = ['-F', '@vitein/mcp', 'exec', 'wrangler', 'secret', 'put', name, '--env', ENV];
  const res = spawnSync('pnpm', args, {
    input: value + '\n',
    stdio: ['pipe', 'inherit', 'inherit'],
  });
  if (res.status !== 0) {
    fail(`Failed to set wrangler secret ${name}`);
    process.exit(res.status ?? 1);
  }
}

// ---------- steps ----------

async function step1ApplyMigration() {
  header(1, 'Apply migration 0004 to Neon');
  note(
    `Open neon.tech → your project → branch "${ENV}" → Connection Details →\n` +
      `"Pooled connection" → "Show password" → copy the full string.\n` +
      `Format: postgresql://<user>:<pass>@<host>.neon.tech/<db>?sslmode=require`,
  );

  let dbUrl = '';
  while (true) {
    dbUrl = await ask(c.bold('Paste the DATABASE_URL (input hidden): '), { hide: true });
    if (dbUrl.startsWith('postgresql://') && dbUrl.includes('neon.tech')) break;
    fail('Must start with postgresql:// and contain neon.tech. Try again.');
  }

  // Soft sanity check: warn if the URL looks like the production branch
  // when we expect staging (or vice-versa). Neon doesn't put env names
  // in URLs deterministically, so this is best-effort.
  if (ENV === 'staging' && /\b(main|prod|production)\b/i.test(dbUrl)) {
    fail(`URL looks like it might be the PRODUCTION branch (ENV=${ENV}). Aborting.`);
    process.exit(1);
  }

  console.log('Running pnpm db:migrate …');
  run('pnpm', ['db:migrate'], { env: { ...process.env, DATABASE_URL: dbUrl } });
  ok('Migration applied.');

  // Keep the URL around for the verify call.
  return dbUrl;
}

async function step2VerifyTables(dbUrl) {
  header(2, 'Verify the oauth_* tables exist');
  note(
    `Querying ${API_BASE_URL} for the OAuth discovery document — the\nplugin only serves it once the schema is in place.`,
  );

  // The well-known endpoint is a more reliable indicator than a raw DB
  // query: it requires the plugin to fully initialise, which depends on
  // the schema. Saves us importing the Neon driver here.
  let attempts = 0;
  while (true) {
    attempts += 1;
    try {
      const res = await fetch(`${API_BASE_URL}/v1/auth/.well-known/oauth-authorization-server`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${String(res.status)}`);
      const body = await res.json();
      if (!body.issuer || !body.authorization_endpoint || !body.token_endpoint) {
        throw new Error('discovery doc missing required fields');
      }
      ok(`Discovery endpoint responds; issuer=${String(body.issuer)}`);
      break;
    } catch (err) {
      if (attempts >= 3) {
        fail(`OAuth discovery still failing after ${String(attempts)} tries: ${String(err)}`);
        note('The migration may not have rolled out yet — wait a minute and re-run this script.');
        process.exit(1);
      }
      note(`Attempt ${String(attempts)} failed (${String(err)}); retrying in 5s…`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  // Silence unused-warn — kept for future "switch to direct psql check"
  void dbUrl;
}

async function step3SignInPrompt() {
  header(3, 'Sign in to the staging dashboard');
  const url = ENV === 'production' ? 'https://vite.in/signin' : 'https://next.vite.in/signin';
  note(
    `Open ${c.bold(url)} in a browser, request a magic link to your email,\n` +
      `click the link, then in DevTools → Application → Cookies copy the\n` +
      `VALUE of the "better-auth.session_token" cookie.`,
  );
  await confirm();
}

async function step4RegisterClient() {
  header(4, 'Register the MCP OAuth client');

  const cookieValue = await ask(c.bold('Paste the session_token cookie VALUE (hidden): '), {
    hide: true,
  });

  if (!cookieValue) {
    fail('Empty cookie. Aborting.');
    process.exit(1);
  }

  console.log('Running register-mcp-oauth-client.mjs …');
  const res = runCapture('node', ['scripts/register-mcp-oauth-client.mjs'], {
    env: {
      ...process.env,
      API_BASE_URL,
      ADMIN_SESSION_COOKIE: `better-auth.session_token=${cookieValue}`,
    },
  });

  // Echo the script's output so the user sees the registered URIs etc.
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);

  if (res.status !== 0) {
    fail('Client registration failed.');
    note('Common cause: the session cookie is expired or for the wrong env.');
    process.exit(res.status);
  }

  const idMatch = res.stdout.match(/MCP_OAUTH_CLIENT_ID=(\S+)/);
  const secretMatch = res.stdout.match(/MCP_OAUTH_CLIENT_SECRET=(\S+)/);

  if (!idMatch) {
    fail('Could not find MCP_OAUTH_CLIENT_ID in the script output.');
    process.exit(1);
  }
  if (!secretMatch) {
    fail('Could not find MCP_OAUTH_CLIENT_SECRET in the script output.');
    note(
      'A duplicate registration returns the row without the secret. Drop the existing client first.',
    );
    process.exit(1);
  }

  ok(`client_id captured (${idMatch[1].slice(0, 8)}…)`);
  ok(`client_secret captured (${secretMatch[1].slice(0, 6)}…)`);

  return { clientId: idMatch[1], clientSecret: secretMatch[1] };
}

async function step5WriteSecrets({ clientId, clientSecret }) {
  header(5, 'Write secrets to the MCP worker');
  note(
    `Calls \`pnpm -F @vitein/mcp exec wrangler secret put NAME --env ${ENV}\` for\n` +
      `both values. You'll see wrangler's own confirmation lines.`,
  );

  setWranglerSecret('MCP_OAUTH_CLIENT_ID', clientId);
  ok('MCP_OAUTH_CLIENT_ID set.');

  setWranglerSecret('MCP_OAUTH_CLIENT_SECRET', clientSecret);
  ok('MCP_OAUTH_CLIENT_SECRET set.');
}

// ---------- main ----------

async function main() {
  console.log(c.bold('vite.in OAuth setup'));
  note(
    `ENV=${ENV} · API=${API_BASE_URL}\nRuns five steps interactively. Ctrl+C to abort at any prompt.\n`,
  );

  const dbUrl = await step1ApplyMigration();
  await step2VerifyTables(dbUrl);
  await step3SignInPrompt();
  const creds = await step4RegisterClient();
  await step5WriteSecrets(creds);

  console.log('\n' + c.green(c.bold('All done.')));
  note(
    'Optional sanity check:\n' +
      `  curl ${API_BASE_URL}/v1/auth/.well-known/oauth-authorization-server | jq\n\n` +
      'End-to-end test with MCP Inspector:\n' +
      `  npx @modelcontextprotocol/inspector https://mcp-${ENV === 'production' ? '' : 'staging.'}vite.in/mcp`,
  );
}

main().catch((err) => {
  fail(String(err));
  process.exit(1);
});
