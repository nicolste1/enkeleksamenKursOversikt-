# Handoff — 2026-08-12 — neste: M6 Filtrering + «Mine leksjoner» (F13)

## Tilstand
Siste commit: b20ce12 «Add realtime board sync with connection indicator (M5)». Pushet.
Ucommittet: Krav.MD (ny F13) og .claude/handoff.md — ta begge med i M6-committen.
Verifisert: M5 i nettleser av Nicolai (to vinduer: celle/rad/gruppe/kolonne/label/funksjon <1 s, N3-konvergens, reconnect-catch-up, sidemeny etter arkivering). Migrasjonen 20260811230000 (replica identity default) er KJØRT i skyen. 122 tester + lint + build grønne på HEAD.
IKKE verifisert: negativ RLS-test (konto uten board-tilgang som realtime-subscriber får ingen events) — åpen siden M3, trenger testkonto/kollega.

## Neste oppgave
Mål: en redigerer med ansvar for leksjoner i ~10 kurs ser dem i ÉN visning, og boards kan filtreres med lagrbare filterkombinasjoner (nyskrevet F13, prioritert foran rapporten).
Ferdig når:
- Filtermodell (felt → is/is not → verdi; And/Or + grupper) evaluerer riktig — unit-testet i src/lib/filters/
- Boardet kan filtreres og grupperes etter person (Ansvarlig)
- Filterkombinasjon kan lagres som navngitt view (ny tabell saved_views, RLS: kun egne) og overlever reload
- «Mine leksjoner»-side på tvers av kurs, forhåndsfiltrert Ansvarlig = meg og «Klar til redigering» = «Ja»
Verifisering: plan-avsnittet «M6 — Filtrering, lagrede views og "Mine leksjoner"»; scenario med ansvar i 2+ kurs mot manuelt fasitsett.

## Det du ikke finner andre steder
- **PostgREST kapper stille på 1000 rader** — funnet i denne økta (demo-boardets redigerte celler «forsvant»). All ubegrenset lesing MÅ gjennom fetchAll() (src/lib/supabase/fetch-all.ts) med stabil .order(); «Mine leksjoner» leser på tvers av alle kurs og treffer taket umiddelbart.
- **Realtime RLS-sjekker IKKE DELETE-events** (bekreftet mot Supabase-docs) — de kringkastes til alle abonnenter. Derfor aldri `replica identity full` på innholdstabeller; kommentaren i 20260810120200_realtime.sql påstår det motsatte og er feil (rettet i 20260811230000, ikke gjenta mønsteret). DELETE-events kan heller ikke filtreres server-side → board-scoping skjer klientside i eventToAction.
- **«Klar til redigering» og «Ansvarlig» har ingen settings.role** — identifiseres kun på tittel. Tverrkurs-filteret trenger robust identifikasjon: avklar i plan mode (ny role i malen + backfill, eller tittelmatch).
- «Mine leksjoner» uten realtime i v1 er et bevisst forslag (board-channel er én kanal per board — ikke abonner på N kurs fra én side).
- Ekko-undertrykking i realtime er bevisst utelatt: å droppe eget ekko divergerer når eget skriv committet før en annens. Reducer-no-ops returnerer samme state-referanse (viktig for ufiltrerte DELETE-lyttere) — behold mønsteret i nye actions.
- Hydration-warning med `fdprocessedid` i konsollen er en nettleserutvidelse hos Nicolai, ikke appen.

## Pekere
- Plan: ~/.claude/plans/ok-vi-skal-n-stateful-donut.md, avsnitt «M6 — Filtrering, lagrede views og "Mine leksjoner"» (rapporten er nå M7)
- Krav.MD: F13 (ny), FR9 (klar-signalet), F5 (kolonnene), N3
- Nøkkelfiler:
  - src/lib/filters/ — finnes ikke ennå; filtermodellen skal hit
  - src/lib/supabase/fetch-all.ts — obligatorisk for tverrkurs-lesing
  - src/lib/boards/reducer.ts + src/lib/realtime/board-channel.ts — M5-mønsteret (rene, testede moduler)
  - src/lib/templates/default-course-template.ts:130 — «Klar til redigering» uten role
  - src/components/board/BoardTable.tsx — filterrad-UI-et kobles på her
  - .claude/coach-notes.md — coachens notater
