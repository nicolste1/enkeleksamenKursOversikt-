# Handoff — 2026-08-11 — neste: M5 Sanntid (F10)

## Tilstand
Siste commit: 7304cb1 «Add Notion-inspired theme, sidebar and progress-rich UI (M4.5)». Pushet.
Ucommittet: CLAUDE.md (arbeidsflyt-seksjon + /handoff-registrering), usporet: .claude/skills/ og .claude/coach-notes.md — ta dem med i M5-committen.
Verifisert: M3–M4.5 i nettleser av Nicolai (inkl. Monday-paritet: «Fullført arbeid» reproduserer eksporttallene). 73/73 tester, lint og build grønne på HEAD.
IKKE verifisert: leser-rolle og kolonnefokus med en ANNEN konto (praktisk RLS-test — trenger kollega/testkonto, står åpen siden M3).

## Neste oppgave
Mål: endringer fra andre brukere synes på boardet uten reload (F10).
Ferdig når:
- To nettleservinduer: endring i det ene synes i det andre <1 s (celle, rad, gruppe, kolonne)
- Samtidig redigering av samme celle konvergerer (LWW på cell_values.updated_at, N3)
- Konto uten board-tilgang får ingen events som subscriber
- Tilkoblingsindikator i UI; test+lint+build grønne
Verifisering: npm run dev + to vinduer (gjerne ett inkognito); plan-avsnittet «M5 — Sanntid» har detaljene.

## Det du ikke finner andre steder
- board-store.tsx er BYGD for M5: reducer-actions (setCell/patchItem/addGroup/…) mapper 1:1 på realtime-events — mat reduceren direkte. IKKE bruk router.refresh() som sync-mekanisme: ny `initial`-prop trigger render-fase-reset av HELE staten (bevisst feilhåndtering, ødeleggende som event-vei).
- Egne optimistiske skriv kommer i retur som events på kanalen — reducer-patchene er idempotente, så ekko er ufarlig, men vurder å sammenligne updated_at før dispatch for å slippe unødige re-renders.
- Reviewer anbefalte å trekke reducer-logikken ut til src/lib/ og teste den FØR realtime kobles på — den er forretningslogikk uten tester i dag.
- Migrasjonen 20260811190000_label_progress.sql ble redigert ETTER at den var kjørt i skyen (ekstra backfill-UPDATEs har aldri kjørt der — ufarlig, seed/app setter progress eksplisitt). Ikke gjenta mønsteret: endringer i anvendt migrasjon = ny migrasjonsfil.
- Realtime-publikasjonen finnes allerede (0003_realtime fra M1) — ingen ny SQL forventes for M5.
- Arkivering oppdaterer ikke sidemenyen før neste navigasjon (ingen refresh ved suksess) — kjent småting, kan løses gratis i M5 når events kommer.
- Kjente aksepterte hull (fra M4-review): endret poengsats på innholdstype-label rekalkulerer ikke eksisterende «Arbeid»-celler før noe på raden endres; arkiv-tidsstempel skrives optimistisk fra klientklokka.
- Grupper uten farge får stabil farge fra navnet (colorFor i label-colors.ts) — groups.color i DB er fortsatt null overalt; farge-velger-UI er bevisst ikke bygget.

## Pekere
- Plan: ~/.claude/plans/ok-vi-skal-n-stateful-donut.md, avsnitt «M5 — Sanntid (F10)» (+ «Realtime» under Nøkkelbeslutninger)
- Krav.MD: F10, N3 (+ §8 FR2 for poengmodellen slik den faktisk er)
- Nøkkelfiler:
  - src/components/board/board-store.tsx — reducer + optimistiske mutasjoner; M5 kobler seg på her
  - src/lib/realtime/ — finnes ikke ennå; planen sier board-channel.ts her
  - src/components/board/board-points.ts — poeng-rollups (celle/gruppe); gjenbrukt av kurskortene via lib/points/course-progress.ts
  - supabase/migrations/20260810120200_realtime.sql — publikasjonen som allerede er live
  - .claude/coach-notes.md — coachens notater; neste økt skal fortsette «verifisert i nettleser: …»-vanen
