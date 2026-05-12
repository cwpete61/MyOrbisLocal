# CLAUDE.md

## ⚠️ Brand Context — READ FIRST

**Brand hierarchy (do NOT confuse these):**

- **MyOrbisResults** — parent company / umbrella brand
- **MyOrbisVoice** — a product of MyOrbisResults
- **MyOrbisLocal** — a *different* product of MyOrbisResults

**MyOrbisVoice and MyOrbisLocal are SEPARATE products.** They have
separate positioning, separate copy, separate audiences. One is NOT
"a feature of" or "a service under" the other. They are siblings.

**This repo (named `MyOrbisLocal`, GitHub `cwpete61/MyOrbisLocal`)
holds the MyOrbisLocal product codebase.** Currently parked.

**MyOrbisVoice development lives in `/home/orbis/Antigravity/OrbisVoice2026/`**
(GitHub `cwpete61/MyOrbisVoice-Main`). If a task is about MyOrbisVoice
copy / branding / landing pages / partner portal / voice agents, **you
are in the wrong directory** — stop, tell the user, and recommend they
open OrbisVoice2026 in a new Antigravity window. Do not import
MyOrbisVoice positioning or copy into surfaces here, and do not push
MyOrbisLocal positioning or copy out to OrbisVoice2026.

**Cautionary tale (2026-05-11):** A session here misread "we are
working on MyOrbisVoice and MyOrbisLocal" as "MyOrbisLocal is the
umbrella brand and OrbisVoice is a product under it." It ran a
global APP_NAME → MyOrbisLocal rebrand on user-facing copy and moved
a marketing style guide between projects before being caught. The
rebrand here is actually correct *for the MyOrbisLocal product*, but
the cross-project file moves had to be reversed. Don't repeat the
underlying mistake: when in doubt about which product a task touches,
ask before acting.

---

## What this is

A **multi-tenant SaaS template** with auth, RBAC, Stripe billing, plans + entitlements,
audit logs, impersonation, push notifications, an example Google OAuth integration,
a complete affiliate program scaffold, and bilingual i18n (en/es).

Use this as a starting point when bootstrapping a new SaaS project.

## Autonomous operation rule — MANDATORY

If the agent runs in bypass-permissions mode, the trade is: **self-verify every step
before moving on**. After every meaningful action:

1. **Read back what you just changed.** If you wrote/edited a file, re-read the changed
   section. If you ran a command, read the actual output, not just the exit code.
2. **Verify the code is correct.** Type-check, build, or lint where it applies. Confirm
   the change matches the intent — no truncated edits, no accidental duplicate blocks.
3. **Check for errors.** Read logs, HTTP status codes, build output. "No error message"
   doesn't mean "success" — confirm the success signal explicitly.
4. **Only then continue** to the next step.

If a check is structurally impossible (e.g. a UI behavior that requires a browser),
say so explicitly rather than implying it was verified.

## Bilingual content rule — MANDATORY

The app is **bilingual English + Spanish**. Every user-facing string ships in both
languages in the same change.

- Marketing pages: `site/<page>.html` (English) + `site/es/<page>.html` (Spanish).
- Dashboard strings: `apps/web/src/lib/i18n/dictionaries/en.json` + `es.json`. Use the
  `t('key')` helper. Adding a string means adding both locales.

Universal references that stay English in both: brand name `MyOrbisLocal`, third-party
provider names (Stripe, Google), URLs/paths, all-caps system codes, template tokens
(`{firstName}` etc).

Spanish style: Latin American Spanish, informal "tú" form (not "usted"). Currency stays
in USD ($).

### i18n enforcement

- `pnpm i18n:check` — scans `.tsx` for hardcoded English JSX text and dictionary parity.
  Required to pass before declaring a feature done.
- `pnpm i18n:fill` — backfills missing `es.json` keys via OpenAI. Reads `OPENAI_API_KEY`
  from env. Review machine translations before committing.

## Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind, i18n (en/es).
- **Backend**: Node.js + Express, TypeScript, modular service layer.
- **Database**: PostgreSQL via Prisma.
- **Cache**: Redis.
- **Billing**: Stripe (subscriptions + Stripe Connect for affiliate payouts).
- **Auth**: Local password + Google OAuth, JWT access tokens, refresh tokens, password reset.
- **Email**: SMTP via Nodemailer.
- **Push**: Web Push (browser notifications).
- **Infra**: Docker compose for dev + prod, Caddy reverse proxy.

## Repo layout

```
/apps
  /api       - Express API (auth, billing, admin, integrations, affiliate)
  /web       - Next.js dashboard + admin + partner portal
  /e2e       - Playwright tests
/packages
  /config    - env schema (zod)
  /shared    - AppError, Result<T>, crypto helpers
  /types     - Domain enums + RBAC role keys
  /ui        - (placeholder for shared UI components)
/infrastructure
  /docker    - docker-compose.prod.yml
  /proxy     - Caddyfile
  /scripts   - deploy.sh, snapshot.sh, etc.
/prisma
  schema.prisma  - 22 models: User/Tenant/Plan/Subscription/Affiliate*/Audit/etc.
  seed.ts        - 7 role definitions + 3 sample plans + 1 platform admin
/site        - Bilingual marketing site (en + /es)
/scripts     - i18n-coverage.ts, i18n-fill.ts
/docs        - 5 reference specs (RBAC, OAuth/secrets, audit, recovery)
```

## RBAC — three platform tiers + tenant roles

**Platform Super Admin** — full access. Only role that can edit credentials,
manage other platform staff. Members live on the `platform` tenant.

**Platform Admin** — tenant management, plans, audit logs. Cannot edit secrets
or grant platform-staff roles.

**Platform Support** — read-only platform access plus impersonation (audit-logged).

**Tenant roles**: Tenant Owner, Tenant Manager, Tenant Staff, Affiliate Partner.

Server-side enforcement: `apps/api/src/middleware/rbac.ts`
(`requirePlatformSupport` / `requirePlatformAdmin` / `requirePlatformSuperAdmin`).
UI mirrors the matrix via `getPlatformRoleTier()` in `apps/web/src/lib/auth.ts`.
Both layers must agree.

## Secrets policy

All secrets are write-only in the UI:
- Admins may rotate, replace, reconnect.
- Admins may not reveal plaintext OAuth refresh tokens, Stripe signing secrets, etc.
- Stored as encrypted `SecretRef` rows or in `SystemConfig` rows with `isSecret=true`.

## Coding standards

1. TypeScript everywhere.
2. Keep files small and purpose-specific.
3. Explicit types on API contracts.
4. Validate external inputs (zod schemas at the boundary).
5. Provider SDKs behind service abstractions.
6. Audit hooks on sensitive writes (impersonation, plan grants, secret rotations).
7. RBAC checked at the route layer, not in the service.
8. Migrations over `db push` for production schema changes.

## Build order for new projects

1. **Foundation** — verify Docker stack boots, Postgres + Redis healthy, run
   `pnpm db:migrate` + `pnpm db:seed`.
2. **Auth flow** — sign up + log in + password reset round-trip.
3. **Billing** — wire Stripe keys via Admin → System Settings, create a sub via
   the `/billing` flow, verify webhook lands in `StripeWebhookEvent`.
4. **Tenant + members** — invite a teammate, verify role gating.
5. **Your domain** — add your product's models to `schema.prisma`, build the
   tenant-facing dashboard pages.
6. **Affiliate program** (optional) — if your product needs partner payouts,
   wire Stripe Connect via `/partner-portal`.

## Things to know

- **Platform tenant**: A tenant with `slug='platform'` is created by the seed.
  Platform-staff users hold their `platform_super_admin` / `platform_admin` /
  `platform_support` role via a `TenantMember` row on this tenant. Don't delete it.
- **Stripe webhook idempotency**: `StripeWebhookEvent` dedupes events by `event.id`
  with at-least-once retry semantics. Purge rows older than 30 days.
- **Refresh tokens**: rotated on every use (revoke old, issue new). See
  `apps/api/src/services/auth.service.ts`.
- **Impersonation**: short-lived JWT with `impersonatedBy` + `impersonationSessionId`.
  Every action during impersonation carries the session ID into audit logs.
- **Brand strings**: `MyOrbisLocal` (brand name), `myorbislocal.com` (marketing site),
  and `app.myorbislocal.com` (dashboard) appear throughout. The original
  `APP_NAME` / `example.com` placeholders from the saas-template baseline have
  already been rebranded — when adding new strings, use the MyOrbisLocal forms
  directly.

## Testing expectations

Per phase manual checks:
- Auth round-trip works (signup → login → refresh → logout).
- Tenant isolation works (user A cannot access tenant B).
- Plan gating works (feature blocked without correct entitlement).
- Stripe webhook signature validation works (use Stripe CLI).
- Audit logs record critical actions (impersonation, plan grants, secret rotation).

## Repo state notes

- This is a stripped template — many surfaces are stubs (`/dashboard/page.tsx`,
  `/admin/help/page.tsx`, etc.). Wire them in for your domain.
- `infrastructure/docker/docker-compose.prod.yml`, `infrastructure/proxy/Caddyfile`,
  `infrastructure/scripts/deploy.sh`, `env-example.txt` were left intentionally
  unchanged from the source project. Update them for your hosting before deploying.
