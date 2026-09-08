# Corinth — multiplayer online (dev)

## Avvio locale (test 4 finestre)

```bash
npm run build:engine
npm run dev:online
```

- Web UI: http://127.0.0.1:5173/corinth/
- PartyServer (wrangler): http://127.0.0.1:8787/

1. Apri 2–4 finestre (meglio profili browser diversi o finestre private).
2. Scegli **Online** → **Crea stanza** su una finestra.
3. Copia il codice a 4 lettere nelle altre → **Entra**.
4. Ognuno si siede su un posto; l’host sceglie 2/3/4 e preme **Avvia**.

## Deploy Cloudflare (gratis)

```bash
cd server
npx wrangler login
npx wrangler deploy
```

Poi imposta `VITE_PARTY_HOST` al worker deployato (es. `corinth.nilom.workers.dev`) e rifai build / riavvia Vite.

## Frontend privato (Cloudflare Pages + password)

- Link: https://corinth.pages.dev/
- Auth HTTP Basic (secrets `SITE_USER` / `SITE_PASSWORD`)
- Deploy: `npm run deploy:pages`
- Cambia password: `printf '%s' 'nuova' | npx wrangler pages secret put SITE_PASSWORD --project-name=corinth`

