# Deploy su Vercel

Si, Vercel va benissimo per questa app.

L'app e' statica: `index.html`, `styles.css`, `main.js` e i file dentro `resources/` vengono serviti direttamente. Non serve un backend vero: quando modifichi i CSV o `regolamento.txt`, basta fare un nuovo deploy e la classifica si aggiorna.

## Preparazione

1. Verifica che nel progetto ci siano questi file:
   - `index.html`
   - `styles.css`
   - `main.js`
   - `vercel.json`
   - `tecnocasa-logo.png`
   - `resources/teams.csv`
   - `resources/punteggi.csv`
   - `resources/partecipanti.csv`
   - `resources/risultati.csv`
   - `resources/regolamento.txt`

2. Prova l'app in locale:

```powershell
node local-server.cjs
```

3. Apri:

```text
http://127.0.0.1:4173
```

## Deploy da interfaccia Vercel

1. Carica il progetto su GitHub, GitLab o Bitbucket.
2. Entra in Vercel e scegli `Add New Project`.
3. Importa il repository.
4. Lascia vuoti i comandi di build, oppure usa queste impostazioni:
   - Framework Preset: `Other`
   - Build Command: vuoto
   - Output Directory: `.`
   - Install Command: vuoto
5. Conferma con `Deploy`.

Nota: il JavaScript frontend si chiama `main.js` e il server locale si chiama `local-server.cjs` per evitare che Vercel li interpreti come Serverless Function.

## Deploy con Vercel CLI

Se preferisci farlo da terminale:

```powershell
npm.cmd install -g vercel
vercel
```

Alla prima pubblicazione Vercel fara' alcune domande. Puoi rispondere cosi:

```text
Set up and deploy? yes
Which scope? scegli il tuo account/team
Link to existing project? no
Project name? totomondiale-tecnologica
In which directory is your code located? ./
Want to modify settings? no
```

Per mandare online la versione definitiva:

```powershell
vercel --prod
```

## Aggiornare risultati e partecipanti

1. Modifica i file in `resources/`.
2. Controlla in locale con `node local-server.cjs`.
3. Fai commit e push se usi Git.
4. Vercel pubblichera' automaticamente la nuova versione.

Se usi la CLI senza Git:

```powershell
vercel --prod
```

## Nota su PowerShell

Su alcuni PC Windows `npm run dev` puo' essere bloccato dalla execution policy. In quel caso usa:

```powershell
npm.cmd run dev
```

oppure direttamente:

```powershell
node local-server.cjs
```
