# REMIX — Flask backend + templates

Stack: Flask · Peewee · MySQL · vanilla JS/CSS templates.
Backend skeleton (services / blueprints / admin) generated with **bro-sba-py** from `models/`,
then completed by hand.

## Run it

```
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # fill DB_NAME / DB_USER / DB_PASSWORD / SECRET_KEY
# For local development set APP_ENV=development, FLASK_DEBUG=true,
# SESSION_COOKIE_SECURE=false, and RATELIMIT_STORAGE_URI=memory:// in .env.
```
Create the empty MySQL database first (`CREATE DATABASE remix CHARACTER SET utf8mb4;`), then:
```
python seed.py              # tables + sample catalogue + admin (password printed once)
python app.py
```
- Site: http://127.0.0.1:5000/
- Admin dashboard: http://127.0.0.1:5000/admin/ (admin login)
- API docs: http://127.0.0.1:5000/api/docs

## Deploying

This project serves the storefront, admin pages, and JSON API from one Flask
application. Keep them on the same host: the storefront calls `/store/*` and
the admin calls `/api/*` using same-origin URLs and the Flask session cookie.
`bro-py.selimbenali.me` is the bro-sba-py generator documentation site; it is
not this app's API host. Do not use it as `API_BASE_URL`.

For production, run the included WSGI app behind an HTTPS reverse proxy and
set `SECRET_KEY` to a long random value, `FLASK_DEBUG=false`,
`SESSION_COOKIE_SECURE=true`, and the database connection variables for your
hosted database. Install `requirements-prod.txt` when deploying outside Docker
so the shared Redis rate-limit backend is available. Use a dedicated non-root MySQL account, not the default `root`
account. Production startup refuses placeholder secrets and unsafe default
MySQL credentials. Keep `.env` out of version control and use a secret manager
for production values. The admin login and data APIs require an active admin
account; customer tokens cannot access management endpoints.

The app applies request limits to login, checkout, newsletter, pre-order, and
cart changes. Set `RATELIMIT_STORAGE_URI` to a shared Redis service when running
multiple workers; in-memory limits are local to each process. Set
`TRUSTED_PROXY_FOR_HOPS` and `TRUSTED_PROXY_PROTO_HOPS` to the exact number of
trusted proxies that set those individual headers. This makes rate limits use
the visitor IP and lets Flask recognize HTTPS; do not trust client-supplied
forwarded headers. Enable HSTS only after HTTPS works for
the whole site. Do not expose Flask's development server to the internet.
Set `SESSION_COOKIE_SECURE=false` only for local HTTP development. Run `seed.py`
only as a deliberate one-time initialization; it adds example catalogue data
and creates the first admin if none exists. Set `ADMIN_EMAIL` and
`ADMIN_PASSWORD` for a production admin; production secrets are not printed.

Before launch, verify database backups and restore, HTTPS for both site and
database connections, the production environment variables, upload directory
permissions and persistence, and a real checkout/order flow. The app currently
creates tables and applies a small schema update during startup; move schema
changes into a controlled migration step before scaling across multiple workers.
If you host the frontend on a different domain, this same-origin setup will not
work without changing frontend URLs and configuring CORS and cross-site cookies.

## Layout

| Path | What | Who wrote it |
|---|---|---|
| `models/` | Peewee models + generator config (insert/update/search fields, auth, custom actions) | by hand |
| `services/*_service.py` | CRUD/search per model | generated; custom actions (`toggle_sold_out`, `mark_paid`, `ship`, `cancel`) by hand below the `CODE CUSTOM` marker |
| `blueprints/<model>/` | `/api/<models>` REST routes (active-admin only) | generated |
| `blueprints/admin_ui/`, `templates/admin/` | admin dashboard | generated |
| `services/storefront_service.py` | public catalogue, guest cart, checkout, newsletter | by hand |
| `blueprints/storefront/` | pages `/`, `/bases`, `/swaps` + public `/store/*` JSON | by hand |
| `templates/`, `static/` | the REMIX front end | by hand |

## Public endpoints (`/store/*`, no login)

`GET /store/bases?type=&sort=` · `GET /store/swaps?artist_id=&sort=` · `GET /store/artists` · `GET /store/reviews`
`GET /store/cart` · `POST /store/cart/items {kind, product_id, quantity, size?}` · `PATCH|DELETE /store/cart/items/<id>`
`POST /store/checkout {full_name,email,address,city,country}` · `POST /store/newsletter {email}`
`GET /store/products/<base|swap>/<id>` serves the product detail page at `/product/<base|swap>/<id>`.

Product images can be uploaded from **Admin → Bases** or **Admin → Swaps**. Select multiple images when creating or editing a product; existing images remain until selected for removal. Images are stored under `UPLOAD_FOLDER` (default: `uploads/`) and exposed at `/uploads/...`. Each file is limited to 10 MB and requests to 100 MB by default (`MAX_CONTENT_LENGTH`). The `product_images` table is created automatically at app startup.

Base product pages read their description, color, feature labels, size options and size guide, details, materials/care, fit, shipping/returns, and included-panel flag from that base's database record. Edit these under **Admin → Bases**; JSON fields accept a JSON list/object. The storefront displays configured sizes and requires a size selection before adding that base to the cart. The selected size is saved on the cart line and order line. On startup, the app adds the corresponding nullable columns to older databases, and fills blank detail fields on the Raven Denim Jacket without changing existing prices or non-empty values.

Order lifecycle: `pending → paid → shipped` (or `cancelled` before shipping), driven by admin actions.

## Regenerating with bro-sba-py

After changing a model: `bro-py-admin --models-dir ./models --output-dir . --auth` then
`bro-py --models-dir ./models --output-dir . --database-engine mysql --auth --docs --skip-app --force`.
Code under the `CODE CUSTOM` marker is preserved. Use `--skip-app` (or re-add the two `storefront_bp` lines to `app.py`).
Note: `search_fields()` must return a dict (`{"name": {"type": str, "operator": "like"}}`) even though the docs show a list.
