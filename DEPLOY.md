# Deploy su Vercel

Vercel pubblica il frontend statico in `public/`; database e API sono gestiti da Supabase.

## Preparazione

1. Completa [SUPABASE_SETUP.md](SUPABASE_SETUP.md).
2. Verifica che `public/config.js` contenga Project URL e chiave pubblicabile corretti.
3. Prova l'app con `npm.cmd run dev`.

## Dashboard Vercel

1. Importa il repository in un nuovo progetto Vercel.
2. Usa `Other` come Framework Preset.
3. Lascia vuoti Build Command e Install Command.
4. Usa `public` come Output Directory, se richiesta.
5. Avvia il deploy.

`vercel.json` configura gia' la pubblicazione statica.

## Vercel CLI

```powershell
npm.cmd install -g vercel
vercel
vercel --prod
```

## Aggiornamento dati

I cambiamenti in Supabase sono visibili senza un nuovo deploy Vercel. In questa fase le scritture API sono bloccate: usa il Table Editor di Supabase fino all'introduzione del pannello admin.

Non configurare mai nel frontend la `service_role`, una secret key o la password del database.
