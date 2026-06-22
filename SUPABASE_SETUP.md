# Setup Supabase

Questa guida porta il progetto dai file CSV a PostgreSQL su Supabase. Lo schema e' predisposto per aggiungere in seguito login e scrittura dei risultati da parte di soli admin; in questa fase il database e' pubblico in lettura e bloccato in scrittura via API.

## 1. Creare il progetto

1. Accedi al [dashboard Supabase](https://supabase.com/dashboard).
2. Crea un progetto nell'organizzazione desiderata.
3. Scegli nome, regione vicina agli utenti e una password robusta per il database.
4. Attendi che il progetto sia pronto.

La password del database non va inserita nell'app e non serve al browser.

## 2. Eseguire la migrazione

1. Nel progetto Supabase apri `SQL Editor`.
2. Crea una nuova query.
3. Incolla tutto `supabase/migrations/202606220001_initial_data.sql`.
4. Premi `Run` e verifica che non siano mostrati errori.

La migrazione crea `scoring_events`, `teams`, `team_results`, `participants`, `participant_picks` e `app_settings`, quindi inserisce tutti i dati precedentemente presenti nei CSV e il regolamento.

La migrazione e' rieseguibile, ma svuota e ripopola i dati iniziali. Dopo le prime modifiche reali non rilanciarla.

## 3. Controllare i dati

Esegui nel `SQL Editor`:

```sql
select count(*) as teams from public.teams;                   -- 48
select count(*) as participants from public.participants;     -- 13
select count(*) as picks from public.participant_picks;        -- 39
select count(*) as results from public.team_results;           -- 51
select count(*) as scoring_events from public.scoring_events;  -- 11
```

Per controllare le relazioni:

```sql
select p.name, pp.pick_order, t.name as team
from public.participant_picks pp
join public.participants p on p.id = pp.participant_id
join public.teams t on t.id = pp.team_id
order by p.name, pp.pick_order;
```

## 4. Configurare l'app

Nel dashboard apri le impostazioni API del progetto o il pannello `Connect` e recupera:

- `Project URL`, simile a `https://abcdefgh.supabase.co`;
- `Publishable key`. Se il progetto mostra le chiavi legacy, puoi usare `anon`.

Modifica `public/config.js`:

```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://abcdefgh.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_...",
};
```

La chiave pubblicabile e' visibile nel browser per design. Non inserire mai `service_role`, una secret key o la password del database: bypasserebbero le protezioni RLS.

## 5. Provare in locale

```powershell
npm.cmd run dev
```

Apri `http://127.0.0.1:4173`. In DevTools, Network deve mostrare richieste verso `https://<project-ref>.supabase.co/rest/v1/` e nessuna richiesta CSV.

Errori comuni:

- `Configura SUPABASE_URL...`: completa `public/config.js`;
- `401` o `403`: controlla chiave e policy RLS;
- `404`: controlla URL e nomi delle tabelle;
- relazione non trovata: attendi l'aggiornamento dello schema API e ricarica.

## 6. Pubblicare su Vercel

Fai commit anche del `public/config.js` configurato e pubblica normalmente. URL e chiave pubblicabile non sono segreti; la sicurezza dipende dalle policy RLS. Dopo il deploy verifica nuovamente le richieste REST.

## Preparazione al futuro admin

Ogni risultato e' una riga di `team_results`, quindi il futuro pannello potra' inserirla o aggiornarla senza cambiare schema. Il prossimo incremento dovra':

1. attivare Supabase Auth;
2. definire una tabella o claim affidabile per identificare gli admin;
3. aggiungere policy RLS `insert`, `update` e `delete` limitate agli admin;
4. usare la sessione autenticata nel client e creare l'interfaccia di gestione.

Non abilitare genericamente la scrittura al ruolo `authenticated`: ogni utente registrato potrebbe modificare i risultati.
