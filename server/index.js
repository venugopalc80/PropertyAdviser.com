import http from 'node:http';
import crypto from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword, verifyPassword, createSessionToken } from './auth.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataFile = resolve(root, 'server/data/leads.json');
const usersFile = resolve(root, 'server/data/users.json');
const port = Number(process.env.PORT || 8787);
const sessions = new Map();

const homes = [
  { id: 1, city: 'Austin, TX', price: 895000, beds: 4, baths: 3, sqft: 2640, type: 'Single Family', address: '1804 Westlake Dr' },
  { id: 2, city: 'Miami, FL', price: 1245000, beds: 3, baths: 2.5, sqft: 2110, type: 'Condo', address: '285 Biscayne Blvd' },
  { id: 3, city: 'Charlotte, NC', price: 749000, beds: 3, baths: 2, sqft: 1980, type: 'Townhouse', address: '912 Queens Rd' },
  { id: 4, city: 'Scottsdale, AZ', price: 2095000, beds: 5, baths: 4, sqft: 4350, type: 'Single Family', address: '7442 N Sunset Blvd' },
  { id: 5, city: 'Denver, CO', price: 589000, beds: 2, baths: 2, sqft: 1240, type: 'Condo', address: '1550 Larimer St' },
  { id: 6, city: 'Nashville, TN', price: 1650000, beds: 4, baths: 3.5, sqft: 3120, type: 'Single Family', address: '4211 Belle Meade Blvd' },
  { id: 7, city: 'Seattle, WA', price: 1125000, beds: 3, baths: 2, sqft: 1870, type: 'Single Family', address: '512 Queen Anne Ave' },
  { id: 8, city: 'Chicago, IL', price: 675000, beds: 3, baths: 2, sqft: 1640, type: 'Condo', address: '820 N State St' }
];

async function readJson(file, fallback = []) {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { return fallback; }
}
async function writeJson(file, value) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value, null, 2));
}
function json(res, status, body, extra = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': process.env.CORS_ORIGIN || 'http://localhost:5173', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET,POST,OPTIONS', ...extra });
  res.end(JSON.stringify(body));
}
async function body(req) { let raw = ''; for await (const chunk of req) raw += chunk; return JSON.parse(raw || '{}'); }
function emailValid(email) { return typeof email === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email); }
function authUser(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now()) { if (token) sessions.delete(token); return null; }
  return session.user;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { ok: true, service: 'propertyadviser-api', timestamp: new Date().toISOString() });

    if (req.method === 'POST' && url.pathname === '/api/auth/register') {
      const b = await body(req);
      if (!emailValid(b.email) || typeof b.password !== 'string' || b.password.length < 8 || typeof b.firstName !== 'string' || typeof b.lastName !== 'string') return json(res, 400, { error: 'Valid name, email and an 8+ character password are required.' });
      const users = await readJson(usersFile);
      const email = b.email.trim().toLowerCase();
      if (users.some(u => u.email === email)) return json(res, 409, { error: 'An account with that email already exists.' });
      const user = { id: crypto.randomUUID(), email, firstName: b.firstName.trim(), lastName: b.lastName.trim(), role: 'buyer', passwordHash: hashPassword(b.password), createdAt: new Date().toISOString() };
      users.push(user); await writeJson(usersFile, users);
      const token = createSessionToken(); sessions.set(token, { user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role }, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });
      return json(res, 201, { user: sessions.get(token).user, token });
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      const b = await body(req); const users = await readJson(usersFile); const user = users.find(u => u.email === String(b.email || '').trim().toLowerCase());
      if (!user || !verifyPassword(b.password, user.passwordHash)) return json(res, 401, { error: 'Invalid email or password.' });
      const safe = { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role };
      const token = createSessionToken(); sessions.set(token, { user: safe, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });
      return json(res, 200, { user: safe, token });
    }

    if (req.method === 'GET' && url.pathname === '/api/auth/me') {
      const user = authUser(req); return user ? json(res, 200, { user }) : json(res, 401, { error: 'Authentication required.' });
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
      const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''); sessions.delete(token); return json(res, 200, { ok: true });
    }

    if (req.method === 'GET' && url.pathname === '/api/listings') {
      const q = (url.searchParams.get('q') || '').toLowerCase(); const type = url.searchParams.get('type') || '';
      const min = Number(url.searchParams.get('min') || 0); const max = Number(url.searchParams.get('max') || Number.MAX_SAFE_INTEGER); const beds = Number(url.searchParams.get('beds') || 0);
      const results = homes.filter(h => (!q || `${h.city} ${h.address}`.toLowerCase().includes(q)) && (!type || h.type === type) && h.price >= min && h.price <= max && h.beds >= beds);
      return json(res, 200, { data: results, count: results.length, source: process.env.DATABASE_URL ? 'database-pending-migration' : 'demo' });
    }

    if (req.method === 'POST' && url.pathname === '/api/leads') {
      const b = await body(req); if (!b || typeof b.name !== 'string' || b.name.trim().length < 2 || !emailValid(b.email)) return json(res, 400, { error: 'Please provide a valid name and email address.' });
      const lead = { id: crypto.randomUUID(), ...b, createdAt: new Date().toISOString() }; const leads = await readJson(dataFile); leads.push(lead); await writeJson(dataFile, leads);
      return json(res, 201, { ok: true, id: lead.id });
    }
    return json(res, 404, { error: 'Not found' });
  } catch (error) { console.error(error); return json(res, 500, { error: 'Internal server error.' }); }
});
server.listen(port, () => console.log(`PropertyAdviser API listening on http://localhost:${port}`));
