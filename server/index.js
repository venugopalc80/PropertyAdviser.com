import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataFile = resolve(root, 'server/data/leads.json');
const port = Number(process.env.PORT || 8787);

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

async function readLeads() {
  try { return JSON.parse(await readFile(dataFile, 'utf8')); }
  catch { return []; }
}

async function saveLead(lead) {
  const leads = await readLeads();
  leads.push(lead);
  await mkdir(dirname(dataFile), { recursive: true });
  await writeFile(dataFile, JSON.stringify(leads, null, 2));
}

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': process.env.CORS_ORIGIN || 'http://localhost:5173', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS' });
  res.end(JSON.stringify(body));
}

function validLead(body) {
  return body && typeof body.name === 'string' && body.name.trim().length >= 2 && typeof body.email === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email) && (!body.phone || typeof body.phone === 'string') && (!body.message || typeof body.message === 'string');
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { ok: true, service: 'propertyadviser-api', timestamp: new Date().toISOString() });
  if (req.method === 'GET' && url.pathname === '/api/listings') {
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const type = url.searchParams.get('type') || '';
    const min = Number(url.searchParams.get('min') || 0);
    const max = Number(url.searchParams.get('max') || Number.MAX_SAFE_INTEGER);
    const beds = Number(url.searchParams.get('beds') || 0);
    const results = homes.filter(h => (!q || `${h.city} ${h.address}`.toLowerCase().includes(q)) && (!type || h.type === type) && h.price >= min && h.price <= max && h.beds >= beds);
    return json(res, 200, { data: results, count: results.length, source: 'demo' });
  }

  if (req.method === 'POST' && url.pathname === '/api/leads') {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    try {
      const body = JSON.parse(raw || '{}');
      if (!validLead(body)) return json(res, 400, { error: 'Please provide a valid name and email address.' });
      const lead = { id: crypto.randomUUID(), ...body, createdAt: new Date().toISOString() };
      await saveLead(lead);
      return json(res, 201, { ok: true, id: lead.id });
    } catch { return json(res, 400, { error: 'Invalid JSON payload.' }); }
  }

  return json(res, 404, { error: 'Not found' });
});

server.listen(port, () => console.log(`PropertyAdviser API listening on http://localhost:${port}`));
