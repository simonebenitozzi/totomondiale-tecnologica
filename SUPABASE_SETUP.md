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

## Area admin e modifica risultati

La password non va salvata in Git, in `config.js` o nelle ENV Vercel. Questo frontend e' statico: qualsiasi variabile usata dal browser diventa ispezionabile. La password viene invece gestita da Supabase Auth e salvata nel database soltanto come hash.

### 1. Applicare la migrazione admin

Esegui nel `SQL Editor` tutto il file:

```text
supabase/migrations/202606220002_admin_results.sql
```

La migrazione crea la lista privata `admin_users`, le policy RLS e la funzione transazionale `save_team_results`.

### 2. Creare l'utente Auth

1. Nel dashboard apri `Authentication` e quindi `Users`.
2. Crea manualmente un utente con email `s.benitozzi@fantamondiale.local`.
3. Imposta una password robusta e marca l'utente come confermato, se richiesto.
4. Non usare la password del database Supabase e non inserirla in alcun file.

La schermata accetta lo username `s.benitozzi` e aggiunge internamente il dominio tecnico. E' possibile anche inserire l'email completa.

La password condivisa in chat non e' stata scritta nel progetto. Se era una credenziale reale gia' in uso, e' prudente sostituirla con una nuova prima della pubblicazione.

### 3. Autorizzare l'utente come admin

Dopo aver creato l'utente, esegui una sola volta:

```sql
insert into public.admin_users (user_id)
select id
from auth.users
where email = 's.benitozzi@fantamondiale.local'
on conflict (user_id) do nothing;
```

Verifica che sia stata inserita una riga:

```sql
select au.email, a.created_at
from public.admin_users a
join auth.users au on au.id = a.user_id;
```

Gli utenti autenticati ma assenti da `admin_users` non possono modificare il database. L'UUID Auth, non lo username mostrato nel browser, determina l'autorizzazione.

### 4. Usare la schermata

1. Apri l'app e premi `Admin`.
2. Accedi con username e password.
3. Nel tab `Nazionali` premi `Modifica risultati`.
4. Modifica i punti e la fase di eliminazione, quindi salva.

Il salvataggio aggiorna `teams.elimination_phase` e sostituisce i risultati della squadra in `team_results` dentro una singola transazione PostgreSQL. Lasciare un risultato vuoto lo elimina; inserire `0` salva esplicitamente zero punti.
