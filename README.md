# Totomondiale Tecnologica

Web app mobile per il Totomondiale dell'ufficio Tecnocasa. Il frontend statico interroga le API REST di Supabase e calcola classifica, premi provvisori, punteggi e percorso delle nazionali.

## Configurazione

Serve Node.js. Prima del primo avvio:

1. crea e popola Supabase seguendo [SUPABASE_SETUP.md](SUPABASE_SETUP.md);
2. imposta URL e chiave pubblicabile in `public/config.js`;
3. avvia il server locale.

```powershell
npm.cmd run dev
```

Apri `http://127.0.0.1:4173`.

## Calcolo punti

```text
punti squadra = punti base ottenuti nel torneo x coefficiente
punti partecipante = somma dei punti delle sue 3 squadre
```

I premi sono 70, 40 e 20 euro. In caso di pari merito, i premi delle posizioni coinvolte vengono sommati e divisi in parti uguali.

## Dati

Schema e dati iniziali sono in `supabase/migrations/202606220001_initial_data.sql`. Login, policy admin e salvataggio risultati sono in `supabase/migrations/202606220002_admin_results.sql`. Le credenziali sono gestite da Supabase Auth e non risiedono nel repository.

## Struttura

```text
.
|-- public/
|   |-- config.js
|   |-- index.html
|   |-- main.js
|   `-- styles.css
|-- scripts/local-server.cjs
|-- supabase/migrations/
|   `-- 202606220001_initial_data.sql
|-- SUPABASE_SETUP.md
|-- DEPLOY.md
`-- vercel.json
```

Le istruzioni di pubblicazione sono in [DEPLOY.md](DEPLOY.md).
