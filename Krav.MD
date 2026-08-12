# Kravspesifikasjon — internt prosjektverktøy (Monday-erstatter)

**Versjon:** 0.4 (kalibrert mot faktisk Monday-bruk via kurseksport) · **Dato:** 2026-08-11 · **Status:** Til diskusjon

## 1. Sammendrag

Internt verktøy for kursproduksjon og daglig drift i enkeleksamen, som erstatter Monday.com. Kun til intern bruk, skal ikke selges. 30–100 brukere. Inspirasjonen hentes fra Mondays konsepter (boards, grupper, statuskolonner), men all kode, design og grafikk lages fra bunnen.

**Kjernebruken:** Hver nettlærer lager kurs i team på 2–3. Teamet setter først opp kursets struktur (kapitler → delkapitler → videoer), og følger deretter hver video gjennom produksjonsløpet: manus → presentasjon → opphavsrett → innspilling → kameraopptak → redigering → opplastning → kvalitetssjekk.

## 2. Omfang v1

**Med i v1:**

- Ett board per kurs, med delkapitler som grupper og videoer som rader
- Tabellvisning som eneste visning, med standardkolonnene for videoproduksjon (se F5)
- Egendefinerte kolonner og labels, kursmal for nye kurs
- Kommentartråd per video med @-nevning
- Varsler i appen + e-post (ved tildeling og @-nevning)
- Google SSO-innlogging
- Rollebasert tilgangsstyring: admin / medlem / leser, per kurs
- Migrering fra Monday: brukere, team/organisasjonsstruktur og kursoppsett (ikke oppgavedata — starter blankt)

**Ikke i v1 (mulige senere versjoner):**

- Automatiseringer (behov ikke avklart — se F12)
- Kanban-, tidslinje-, kalender- og dashboardvisninger
- Ressurs-/bemanningsoversikt og timeestimat
- Chat-integrasjoner (Google Chat/Slack)
- Gjestetilgang for eksterne

## 3. Funksjonelle krav

| # | Krav |
|---|------|
| F1 | Bruker logger inn med Google-jobbkonto (SSO). Ingen lokale passord. |
| F2 | Admin kan opprette workspaces, boards og grupper, og tildele board-tilgang per team/person. |
| F3 | Roller: **admin** (alt), **medlem** (opprette/redigere oppgaver på egne boards), **leser** (kun lese). |
| F4 | **Kursstruktur:** Et board = ett kurs. Kurset har kapitler, hvert kapittel har delmengder av delkapitler, og hvert delkapittel er en gruppe i tabellen (f.eks. «1.1 Mengder, relasjoner og funksjoner – Mengder og notasjon»). Radene i gruppen er videoer/leksjoner. Grupper kan kollapses, sorteres og flyttes. |
| F5 | **Videorad — standardkolonner:** Hver video har som standard: Leksjon (navn), Type innhold (label: Teorivideo, Oppgavevideo, Kombivideo, Repetisjonsoppgaver, Artikkel), Importert (label: Ny, Noe gjenbruk, Importert — se FR11), Lenke (URL), Ansvarlig (person), produksjonssteg som statuskolonner: Manus, Presentasjon, Opphavsrett, Innspilling, Kameraopptak, Redigering, Opplastning, Kvalitetssjekk, samt Klar til redigering (label: Ja, Nei, Ikke behov — se FR9). I tillegg Antall spørsmål (tall) og Oppgavetype (label) som styrer estimatet for repetisjonsoppgaver (se FR1), tallkolonnene Arbeid (poeng, se FR1) og Fullført arbeid (beregnes av appen, se FR2), og Innholdskategori (label: Leksjon, Introduksjonsvideo, Eksamensanalyse, Annet). |
| F6 | **Statusverdier:** Standardverdier er Ferdig, Under arbeid, Trenger tilbakemelding, Har gitt tilbakemelding, Ikke startet og Ikke behov — hver med egen farge. Brukere kan legge til egne labels med valgfri farge per kolonne. |
| F7 | **Egendefinerte kolonner:** Teamet kan legge til nye kolonner på et kurs (typene status, person, dato, tekst, tall, lenke, label) og endre rekkefølgen. Nye kurs kan opprettes fra en mal med standardkolonnene i F5. |
| F8 | Hver video har kommentartråd med @-nevning; antall kommentarer vises som ikon på raden. @-nevning og tildeling utløser varsel. |
| F9 | Varsler vises i appen (klokke) og sendes på e-post. Bruker kan skru av e-postvarsler. |
| F10 | Endringer fra andre brukere vises uten at man må laste siden på nytt (sanntid). |
| F11 | Alle kurs kan eksporteres til CSV/Excel. |
| F12 | *(Utsatt — spesifiseres senere)* Automatiseringer. Behovet er ikke avklart ennå; designes ikke i v1, men datamodellen skal ikke stenge for det. |
| F13 | **Filtrering og lagrede visninger:** Tabellen kan filtreres per kolonne (felt → operator *is*/*is not* → verdi, f.eks. status «Ferdig» eller «Nei»); flere filtre kombineres med And/Or og kan grupperes («+ New group»). En filterkombinasjon kan lagres som navngitt view. Boardet kan i tillegg filtreres/grupperes etter person. Egen tverrkurs-visning **«Mine leksjoner»** viser alle leksjoner brukeren står som Redigeringsansvarlig for på tvers av kursene sine, forhåndsfiltrert på «Klar til redigering» = «Ja» — redigerer-arbeidsflyten (redigeringsansvar i mange kurs) uten å åpne hvert board. |

## 4. Ikke-funksjonelle krav

| # | Krav |
|---|------|
| N1 | Tåler 100 samtidige brukere uten merkbar treghet (< 500 ms responstid på vanlige operasjoner). |
| N2 | Automatisk daglig backup med punkt-i-tid-gjenoppretting (min. 7 dager). |
| N3 | Ingen endring går tapt ved samtidig redigering — sist lagret vinner, med sanntidsoppdatering som minimerer kollisjoner. |
| N4 | Kun ansatte med bedriftens Google-domene kan logge inn. |
| N5 | All trafikk over HTTPS; database ikke eksponert mot internett. |
| N6 | Slettede oppgaver havner i papirkurv (30 dager) før permanent sletting. |
| N7 | Én navngitt person internt har driftsansvar (oppdateringer, backupsjekk, brukeradministrasjon). |

## 5. Juridiske rammer

- Egen kode, eget design, eget navn og egen grafikk — ingen kopiering fra Monday.
- Funksjonelle konsepter (boards, statuser, automatiseringer) er ikke opphavsrettsbeskyttet og kan gjenbrukes fritt.
- Egne data eksporteres fra Monday med deres eksportfunksjon (lovlig som kunde).
- Kun intern bruk — ingen videresalg eller ekstern distribusjon.

## 6. Teknologiskisse (forslag)

- **Frontend:** React/Next.js (tabellkomponent er kjernen)
- **Backend + database:** Supabase (administrert Postgres) — gir Google SSO, sanntidsoppdateringer, radnivå-tilgangsstyring og automatisk backup ut av boksen
- **Hosting:** Vercel (frontend) + Supabase (data). Estimert kost: ~50–100 USD/mnd ved denne skalaen
- **E-post:** Resend eller lignende for varsler

Postgres håndterer denne skalaen med god margin — «databasen krasjer ved mye bruk» er ikke en reell risiko her. De reelle risikoene er tilgangsstyring og at driftsansvaret faktisk følges opp.

## 7. Faseplan (vibe coding-tempo)

1. **Dag 1–2: Datamodell + skjelett** — database, Google-innlogging, opprette kurs/grupper/rader
2. **Dag 3–5: Tabellvisning** — alle kolonnetyper, redigering, statuser med farger, sanntid
3. **Uke 2: Kommentarer, varsler, tilgangsstyring, kursmal + egendefinerte kolonner**
4. **Uke 2–3: Finpuss + testing** — eksport, papirkurv, ytelsestest med testdata
5. **Pilot: ett kursteam kjører parallelt med Monday i 2–4 uker** — dette kan ikke komprimeres; det er ekte bruk som avdekker manglene
6. **Migrering av struktur + utrulling** — Monday sies opp etter én full periode uten problemer

Byggingen går altså fort (2–3 uker til pilotklar), men piloten bør fortsatt få gå sin tid — det er den som beskytter dere mot å si opp Monday for tidlig.

## 8. Forretningsregler (fra intervjurunde A–D)

Regler appen skal håndheve (beregne/styre):

| # | Regel |
|---|------|
| FR1 | **Poengsats per innholdstype:** Ett poeng representerer arbeidstid. Hver innholdstype har en fast poengsats som admin konfigurerer (standard: Teorivideo, Oppgavevideo og Kombivideo 10; Artikkel 5). Unntak: Repetisjonsoppgaver har ingen fast sats — arbeidet beregnes som Antall spørsmål × sats per spørsmål, der satsen kommer fra Oppgavetype-labelen (Matematikk 1,0; uten label 0,5). «Arbeid» settes automatisk fra dette når en video opprettes, og kan overstyres manuelt. |
| FR2 | **Automatisk poengopptjening:** Hvert produksjonssteg utgjør en konfigurerbar andel av videoens poeng (standardvekter: Manus 40 %, Presentasjon 25 %, Innspilling 15 %, Kameraopptak, Redigering, Opplastning og Kvalitetssjekk 5 % hver; Opphavsrett følges uten vekt). «Fullført arbeid» beregnes av appen med delvis kreditt per status: Ferdig 100 %, Har gitt tilbakemelding 75 %, Trenger tilbakemelding 50 %, Under arbeid 25 %, Ikke startet 0 %. «Ikke behov» tildeler stegets andel fullt ut — ingen omskalering av de øvrige andelene. |
| FR3 | **Fremdriftsrapport:** Egen rapportside for ledelsen med (a) fremdrift per kurs: opparbeidet vs. beregnet poeng og % ferdige videoer, og (b) fremdrift per person: poeng og aktive videoer per nettlærer. |
| FR4 | **Kursadministrasjon:** Både admin og vanlige brukere kan opprette kurs. Hver nettlærer setter opp og endrer kapittel-/delkapittelstrukturen på sine egne kurs, og teamet oppretter og redigerer videoradene innenfor strukturen. |
| FR5 | **Arkivering:** Ferdigproduserte kurs arkiveres — skjules fra aktiv liste og blir skrivebeskyttet, men kan gjenåpnes av admin. |

Regler appen bare skal synliggjøre (ingen sperrer):

| # | Regel |
|---|------|
| FR6 | **Anbefalt stegrekkefølge:** Produksjonsstegene har en anbefalt rekkefølge (manus → presentasjon → … → kvalitetssjekk), gjenspeilet i kolonnerekkefølgen. Ingen advarsler eller sperrer — teamet jobber fritt. |
| FR7 | **Tilbakemeldingssløyfe:** «Trenger tilbakemelding ↔ Har gitt tilbakemelding» kan gjentas fritt. Tilbakemelding gis av teamkollega eller fagansvarlig. Statusendringen utløser ingen varsler, og ingen sperre for å sette Ferdig. |
| FR8 | **Tilbakemelding skjer i Google Docs/Drive:** Selve innholdet i tilbakemeldingen ligger i arbeidsfilene (Lenke-kolonnen). Appen trenger status, varsling og lenke — ikke eget review-verktøy. |
| FR9 | **«Klar til redigering»** settes manuelt som et bevisst signal. Ingen hint eller automatikk. |
| FR10 | **Fleksibelt redigeringsansvar:** Hvem som gjør redigering/opplastning/kvalitetssjekk varierer per kurs. Kursmalen inkluderer derfor egen personkolonne «Redigeringsansvarlig» som kan settes per video. |
| FR11 | **Importert-kolonnen** angir gjenbruk av innhold fra andre kurs (Ny / Noe gjenbruk / Importert). Ingen fristlogikk i v1 (jobbes kontinuerlig). |

## 9. Vedlikehold

- Ukentlig: sjekk at backup kjører, gjennomgå feillogg
- Ved behov: brukere inn/ut, nye statusverdier/kolonner
- Kvartalsvis: oppdatere avhengigheter, vurdere ønskeliste fra brukerne
