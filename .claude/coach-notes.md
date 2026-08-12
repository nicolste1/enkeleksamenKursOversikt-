# Coach-notater — Enkeleksamen arbeidsflyt

## 2026-08-11 — Første coach-økt (sjekkpunkt: M3 ferdig)

### Observert (økt fd9d170d, commits 851de54 + 95b5ac2)
- **Promptkvalitet: sterk.** Oppstartsprompt var en full handoff (~4400 tegn):
  status M0–M2, arbeidsregler, liste over ferdige moduler i src/lib/, mål og
  verifisering for M3. Dette er vanen vi vil ha.
- **Midtveis-pivot: forbilledlig.** Avviste generisk demodata, eksporterte ekte
  kursdata fra Monday til Excel og brukte den som fasit for datamodell, tester
  og demodata. Avdekket at FR2 i Krav.MD ikke stemte med faktisk bruk — kravdok
  oppdatert. "Gi modellen ekte data, ikke antakelser" sitter.
- **Prosessdisiplin:** SQL godkjent eksplisitt før kjøring, db push/typegen
  kjørt selv, reviewer-agent kjørt før begge commits (fant stored-XSS via
  lenkeceller + collation-sorteringsfelle, fikset før commit), eksplisitt
  commit-godkjenning per milepæl.
- **Svakhet: sluttverifisering delegert bort.** Sa «ja, og fortsett» /
  «Ja» til commit uten (så vidt observert) å ha åpnet demokurset i nettleseren.
  CLAUDE.md sier UI testes manuelt frem til pilot — da er nettleseren HANS del
  av verifiseringsloopen, og den ble hoppet over. Grønne tester dekker kun lib/.
- **Mindre ting:** Handoff-prompten gjentar regler som alt står i CLAUDE.md,
  og inneholder to ting som IKKE står der (db push kjøres av bruker selv;
  milepæl-loopen kode → test/lint/build → reviewer → godkjenning → commit).
  De to hører hjemme i CLAUDE.md; modul-lista hører hjemme i planfila.

### Habitstige-status
1. Promptkvalitet: god. 2. Plan mode: god (planfil brukes aktivt).
3. Verifisering: delvis — automatikk god, manuell UI-sjekk mangler før commit.
4. CLAUDE.md: god, to hull (se over). 5–7: ok. 8: reviewer-agent alt i bruk.

### Utfordring gitt for neste økt
Ikke gi commit-godkjenning på UI-milepæler før verifiseringspunktene fra
oppstartsprompten er sjekket i nettleser. Skriv «verifisert i nettleser: …»
i godkjenningsmeldingen — for hver commit i neste økt.

### Følg opp neste gang
- Ble UI-verifisering før commit en vane? (Se etter «verifisert i nettleser».)
- Ble db-push-rutinen og milepæl-loopen flyttet inn i CLAUDE.md?
- Hvis 1–5 sitter: vurder å foreslå hooks (auto-lint/test) eller parallelle
  worktrees som neste nivå.
