# Syncing Vela across your devices (via GitHub)

Vela is local-first — your data lives on each device. To keep phone, tablet, and
laptop in sync **without a server or account**, Vela can store your data in a
single **private GitHub gist** that all your devices read and write.

## One-time setup (do this on a computer)

1. Create a GitHub token with **only the `gist` scope**:
   <https://github.com/settings/tokens/new?scopes=gist&description=Vela%20sync>
2. In Vela: **Settings → Sync across devices** → paste the token → **Connect**.
   Vela creates a private gist (`vela-data.json`) and backs up your data.
3. On each other device, open **Settings → Sync across devices** and paste the
   **same token**. Vela finds the same gist automatically.

## How it works

- **Auto-sync (on by default):** Vela pulls the latest when you open it, and
  backs up a few seconds after you change something.
- **Manual:** **↑ Back up now** and **↓ Get latest** push/pull on demand.
- **Last write wins.** With one person across their own devices that's all you
  need; just avoid editing two devices at the exact same moment while offline.

## Privacy & safety

- The token is stored **only on that device** and is **never** included in the
  synced data, so it never reaches the gist.
- The gist is **private**. Use a `gist`-only token so a leak can't touch your
  repos or account.
- **Disconnect** removes the token from the device; the gist keeps its last copy
  until you delete it on GitHub.
