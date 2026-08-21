# Consolidated patch — everything from this session

This replaces all previous zips. Apply this one over `prointeractive-full/`
and ordering stops mattering.

The Docker build failed because `Home.jsx` came from a later patch than
`interests.js` — the later file imported `needsInterestGate`, which the older
one didn't export. Nine overlapping partial patches made that easy to hit.
Every file here is taken from a single tree that builds clean.

## Verified before packaging

- `npx vite build` — the exact command that failed in your Dockerfile — passes
- All 56 files' local imports resolve against real exports (see below)

## Apply

    unzip -o consolidated-patch.zip -d prointeractive-full/
    cd prointeractive-full/frontend && npm run build   # should succeed

## Delete two files

These were the buyer<->seller WhatsApp chat buttons, now removed because
conversation stays on Prointeractive. Nothing imports them any more:

    rm frontend/src/components/WhatsAppButton.jsx
    rm mobile/src/components/WhatsAppButton.js

## Catching this class of bug yourself

`check-imports.py` walks frontend, mobile and backend, resolves every relative
import, and reports anything importing a name that isn't exported — the exact
failure above, but in a second rather than after a full Docker build.

    cd prointeractive-full        # IMPORTANT: run from the project root
    python3 check-imports.py

Run it from the merged project root, NOT from inside this zip. This zip holds
only changed files, so running it here reports ~108 false "MISSING FILE" hits
for untouched modules like `api.js` that simply aren't in the archive.

Against the full tree it prints:

    All local imports resolve. No drift.

Run it before pushing. Clean output means the build will not fail this way.

## Backfills to run once, after deploying the backend

    node scripts/backfillBasePrice.js            # dry run first
    node scripts/backfillBasePrice.js --apply
    node scripts/backfillUserPhone.js            # dry run first
    node scripts/backfillUserPhone.js --apply

## Still outstanding

- `frontend/public/.well-known/` has two placeholders that block mobile
  password saving — see the README in that folder
- Mobile changes need a new EAS build; the store version has none of this
