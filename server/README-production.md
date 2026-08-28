# PropertyAdviser API production notes

The API is designed around PostgreSQL. Run `server/schema.sql` against the production database before enabling database-backed routes.

Required environment variables:

- `DATABASE_URL`
- `SESSION_SECRET`
- `CORS_ORIGIN`
- `PORT`

Passwords must be stored as PBKDF2 hashes using `server/auth.js`; never store plaintext passwords.

The current repository still contains demo listing data in `server/index.js`. MLS/IDX data should be introduced through an adapter that maps provider records into the `properties` and `property_images` tables. Do not commit API credentials.
