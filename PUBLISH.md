# Commit, push e deploy

Guida rapida per pubblicare modifiche a Corinth.

Sito live: https://corinth.pages.dev/

---

## 1. Controlla cosa stai per pubblicare

Da terminale (root del progetto):

```bash
git status
git diff
```

Da IDE: tab **Source Control** — file modificati e diff.

---

## 2. Commit in locale

```bash
git add -A
git commit -m "Messaggio chiaro sul perché del cambio"
```

Da IDE: stage dei file → messaggio → **Commit**  
(non usare ancora Sync/Push se vuoi solo salvare in locale).

Il commit **non** aggiorna il sito né GitHub.

---

## 3. Push sul remote

```bash
git push origin main
```

Da IDE: **Push** / **Sync Changes** sul branch `main`.

Effetti:

- aggiorna GitHub
- avvia il workflow **Deploy GitHub Pages** (se usi quella URL)

**Non** aggiorna da solo [corinth.pages.dev](https://corinth.pages.dev/) (Cloudflare Pages è un passo a parte).

---

## 4. Deploy frontend (Cloudflare Pages)

```bash
npm run deploy:pages
```

Una tantum, se non sei già loggato:

```bash
npx wrangler login
```

Questo aggiorna il gioco su **corinth.pages.dev**.

---

## 5. Deploy online (solo se serve)

Se hai cambiato `engine/` (regole validate dal server) o `server/`:

```bash
cd server
npx wrangler deploy
cd ..
```

(`npx` evita errori se `wrangler` non è installato in globale.)

Poi, se hai anche cambiato il client, rifai `npm run deploy:pages` così client e worker restano allineati.

Se hai toccato solo UI in `index.html` senza cambiare le regole server, di solito basta lo step 4.

---

## Checklist tipica

Esempio: fix alle regole negozi + UI.

```bash
npm test                 # opzionale ma utile
npm run build:engine     # se hai toccato engine/
git add -A
git commit -m "Fix: ordine marks negozi nello stesso turno"
git push origin main
npm run deploy:pages
cd server && npx wrangler deploy && cd ..
```

---

## Cosa fa ogni azione

| Azione | Effetto |
|--------|---------|
| Commit | Solo sul tuo PC |
| Push | GitHub (+ eventualmente GitHub Pages) |
| `npm run deploy:pages` | Sito Cloudflare (corinth.pages.dev) |
| `npx wrangler deploy` in `server/` | Partite online (Party worker) |
