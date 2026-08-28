# PropertyAdviser API

A small dependency-free local API used to establish the backend contract before connecting production services.

## Run

```bash
npm run api
```

The API listens on `http://localhost:8787` by default.

## Endpoints

- `GET /api/health` health check
- `GET /api/listings?q=Austin&min=500000&max=1200000&beds=3&type=Single%20Family` listing search
- `POST /api/leads` accepts `{ "name": "Jane Doe", "email": "jane@example.com", "phone": "...", "message": "..." }`

Leads are stored locally in `server/data/leads.json` for development only. Before production, replace this store with PostgreSQL and add authentication, rate limiting, audit logging and encrypted secrets.

The listing dataset is explicitly demo data. Production launch requires a properly licensed MLS/IDX or other listing-data provider and compliance with its display/attribution rules.
