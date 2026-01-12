# Invites Plan

## Goal
Add a manual invite flow for project access using a single shared environment, with project-scoped, single-use tokens and no expiry.

## Constraints
- Single instance for now.
- No ORM; raw SQL.
- Manual sharing (no email).

## Plan (current)

- [x] Step 1: Introduce a minimal SQLite DB layer (raw SQL)
  - Files:
    - Add `packages/api/src/db/index.ts` (open DB + bootstrap schema)
    - Add `packages/api/src/db/types.ts` (shared DB/store types)
    - Modify `packages/api/package.json` (add SQLite dependency)

- [x] Step 2: Add domain DataStores (InvitesStore)
  - Files:
    - Add `packages/api/src/stores/InvitesStore.ts` (createInvite, listInvites, revokeInvite, acceptInvite)
    - Add `packages/api/src/stores/index.ts` (store exports)

- [x] Step 3: Wire DB + stores into the API + routes (invite creation requires Bearer project token)
  - Files:
    - Modify `packages/api/src/serve.ts` (open DB, construct stores, pass to API)
    - Modify `packages/api/src/RegressionProofApi.ts` (accept stores, add `/invites` endpoints, verify Bearer token via Gitea)

- [x] Step 4: Persist the DB on EC2
  - Files:
    - Modify `scripts/deploy-ec2.sh` (mount API data volume + set `API_DB_PATH`)

- [x] Step 5: Add CLI invite commands (manual flow)
  - Files:
    - Modify `packages/cli/src/` router/command registration (add `invite`)
    - Add `packages/cli/src/commands/invite/CreateInvite.ts`
    - Add `packages/cli/src/commands/invite/AcceptInvite.ts`
    - Add `packages/cli/src/commands/invite/ListInvites.ts`
    - Add `packages/cli/src/commands/invite/RevokeInvite.ts`

- [ ] Step 6: Document the manual invite flow
  - Files:
    - Modify `README.md` (invite usage examples)
    - Modify `docs/PROJECT.md` (manual copy/paste flow)

## Open Decisions
- SQLite library: `better-sqlite3` vs `sqlite3`
