@AGENTS.md

# Enkeleksamen arbeidsflyt

Internt prosjektverktøy for kursproduksjon i enkeleksamen — erstatter Monday.com. 30–100 brukere, kun intern bruk. Boards (kurs) → grupper (delkapitler) → rader (videoer) med statuskolonner for produksjonsløpet.

**Kravene står i `Krav.MD`** — den er kilden til all funksjonalitet. Ved tvil om hva som skal bygges: les den, ikke gjett.

## Teknologistack

- **Next.js 16** (App Router, `src/`-mappe) + **TypeScript strict** — NB: nyere enn treningsdataene; sjekk `node_modules/next/dist/docs/` ved API-tvil (se AGENTS.md)
- **Tailwind CSS 4** + **shadcn/ui** (tabellkomponenten er kjernen i appen)
- **Supabase** — Postgres, Google SSO (Auth), Realtime, Row Level Security
- **Resend** for e-postvarsler
- **Vitest** for tester · **npm** som pakkebehandler · Hosting: Vercel + Supabase

## Kommandoer

| Kommando | Gjør |
|---|---|
| `npm run dev` | Dev-server (Turbopack) på localhost:3000 |
| `npm run build` | Produksjonsbygg |
| `npm test` | Vitest (kjør én gang) |
| `npm run test:watch` | Vitest i watch-modus |
| `npm run lint` | ESLint |

## Mappestruktur

```
src/
  app/            # Ruter (App Router). kebab-case-mapper
  components/
    ui/           # shadcn/ui-komponenter — genereres, endres minst mulig
    <feature>/    # Egne komponenter gruppert per feature (board/, comments/, …)
  lib/            # Forretningslogikk og Supabase-klienter. All databasetilgang her
    __tests__/    # Vitest-tester for lib/
supabase/
  migrations/     # SQL-migrasjoner (når Supabase settes opp)
```

## Konvensjoner

- **Engelsk kode, norsk UI.** Variabler, funksjoner, kommentarer og commit-meldinger på engelsk. All tekst brukerne ser (knapper, labels, statuser, e-poster) på norsk.
- **Komponenter:** PascalCase-filnavn, én komponent per fil. Server Components som standard; `"use client"` kun når nødvendig (interaktivitet, hooks).
- **Filnavn ellers:** kebab-case i `lib/` og for rutemapper.
- **Databasetilgang kun via `src/lib/`** — aldri Supabase-kall direkte i komponenter eller ruter. Dette holder tilgangslogikken samlet og testbar.
- **Commits:** engelsk, imperativ («Add course table view»), små og fokuserte.

## Testing

Vitest på forretningslogikk i `src/lib/` — spesielt tilgangsstyring, statusregler og eksport. UI-komponenter testes manuelt frem til pilot; ikke skriv komponenttester uten at det er avtalt.

## Arbeidsflyt

**Milepæl-loopen** — hver milepæl går gjennom disse stegene i rekkefølge:
kode → `npm test` + `npm run lint` + `npm run build` → `reviewer`-agent → manuell
verifisering i nettleser → godkjenning fra bruker → commit.

Nettleser-steget er ikke valgfritt på UI-milepæler: grønne tester dekker kun
`src/lib/`, så UI-en er uverifisert til noen har åpnet den. Be eksplisitt om
denne bekreftelsen før du foreslår commit.

## Ting Claude IKKE skal gjøre

- **Aldri committe eller pushe uten godkjenning.** Foreslå commit-melding, vent på ja.
- **Aldri kjøre databasemigrasjoner eller endre RLS-policyer uten å vise SQL-en først.** Tilgangsstyring er prosjektets største risiko — feil her lekker data mellom team. `supabase db push` og typegen kjøres av brukeren selv — Claude skriver migrasjonsfilene, brukeren kjører dem.
- **Aldri lese eller skrive `.env*`-filer** eller håndtere API-nøkler. Be brukeren legge inn verdier selv.
- **Aldri installere nye avhengigheter uten begrunnelse og godkjenning.**
- **Aldri kopiere design, grafikk eller tekst fra Monday.com.** Konsepter (boards, statuser) er lov; kopiering er det ikke (Krav.MD §5).

## Agenter — arbeidsfordeling

- **Hovedagenten (denne konteksten):** all implementering.
- **Explore-subagent:** brede søk gjennom mye kode («hvor håndteres X?»). Søket skjer i subagentens kontekst; bare konklusjonen kommer tilbake.
- **`reviewer`** (`.claude/agents/reviewer.md`): ser på diffen med friske øyne før commit — bugs, sikkerhet/RLS, glemt opprydding. Bruk den før hver commit av betydning.
- **`vibe-coach`** (`.claude/agents/coach.md`, speiler `coach.MD` i roten): coacher brukerens arbeidsflyt med Claude Code (promptkvalitet, plan mode, verifisering). Kjøres ved naturlige sjekkpunkter eller når brukeren sier «coach» / «feedback på arbeidsflyt». Skal aldri implementere eller reviewe kode; fører egne notater i `.claude/coach-notes.md`. Hvis `coach.MD` endres, kopier den til `.claude/agents/coach.md` så de holdes i synk.
- **`/handoff`** (`.claude/skills/handoff/SKILL.md`): skriver `.claude/handoff.md` ved øktslutt. `/handoff start` plukker den opp i ny økt etter `/clear`.
