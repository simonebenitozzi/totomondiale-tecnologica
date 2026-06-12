# Totomondiale Tecnologica

Web app semplice per gestire il Totomondiale dell'ufficio Tecnocasa.

L'app e' pensata per mobile, legge direttamente i file dentro `public/resources/` e calcola:

- classifica dei partecipanti;
- premi provvisori, inclusi i pari merito;
- punteggio calcolato di ogni squadra;
- dettaglio del percorso di ogni squadra nelle varie fasi del Mondiale;
- dettaglio delle 3 squadre scelte da ogni partecipante;
- regolamento e tabella punteggi.

## Avvio locale

Serve Node.js.

```powershell
node scripts/local-server.cjs
```

Poi apri:

```text
http://127.0.0.1:4173
```

In alternativa:

```powershell
npm.cmd run dev
```

Su alcuni PC Windows `npm run dev` puo' essere bloccato dalla policy di PowerShell; `npm.cmd run dev` evita il problema.

## File dati

I dati modificabili sono in `public/resources/`:

- `teams.csv`: squadre, girone e coefficiente;
- `punteggi.csv`: punteggi associati agli eventi;
- `partecipanti.csv`: partecipanti e 3 squadre scelte;
- `risultati.csv`: risultati inseriti per ogni squadra;
- `regolamento.txt`: testo del regolamento mostrato nell'app.

Quando cambi un CSV o il regolamento, ricarica la pagina per vedere i dati aggiornati.

## Come vengono calcolati i punti

Per ogni squadra:

```text
punti squadra = punti base ottenuti nel torneo x coefficiente
```

Per ogni partecipante:

```text
punti partecipante = somma dei punti delle sue 3 squadre
```

I premi sono:

- primo posto: 70 euro;
- secondo posto: 40 euro;
- terzo posto: 20 euro.

In caso di pari merito, i premi delle posizioni coinvolte vengono sommati e divisi in parti uguali.

## Deploy

Vercel va bene per questo progetto perché l'app e' statica e pubblica direttamente `public/`.

Le istruzioni complete sono in [DEPLOY.md](DEPLOY.md).

Nota per Vercel: `vercel.json` forza il deploy statico con `@vercel/static`, cosi Vercel non cerca un entrypoint Node e non crea Serverless Function.

## Struttura

```text
.
├── package.json
├── DEPLOY.md
├── README.md
├── vercel.json
├── scripts/
│   └── local-server.cjs
└── public/
    ├── index.html
    ├── main.js
    ├── styles.css
    ├── tecnocasa-logo.png
    ├── favicon.ico
    └── resources/
        ├── partecipanti.csv
        ├── punteggi.csv
        ├── regolamento.txt
        ├── risultati.csv
        └── teams.csv
```
