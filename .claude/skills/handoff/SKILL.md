---
name: handoff
description: >
  This skill should be used when the user says "handoff", "skriv handoff",
  "avslutt økta", "vi er ferdige med M<n>", or otherwise asks to hand the work
  over to a fresh context before /clear. With the argument "start" (or "les",
  "fortsett") it does the reverse: reads .claude/handoff.md and resumes the next
  task in a clean session.
---

# Handoff between sessions

Hand work over to a fresh context without dragging the old context along. The
handoff file is `.claude/handoff.md` — a single file, overwritten every time.
Its git history is the archive; no dated copies.

**Write the handoff document in Norwegian.** These instructions are English; the
output is read by both Claude and Nicolai, and project convention is Norwegian
for anything a human reads.

## The one principle

A handoff contains **only what `/clear` destroys and no source can reconstruct.**

Everything written down somewhere — CLAUDE.md, AGENTS.md, `Krav.MD`, the plan
file, `git log` — is not lost by clearing, so it gets a pointer, never a copy.
What is lost is what happened inside the session: decisions made and why, dead
ends, traps discovered, what was actually verified and what only looks done.
That is the handoff.

A handoff that reads like a project summary has failed. A handoff that reads
like a note from someone who just stood up from the desk has succeeded.

## Mode selection

Argument `start`, `les`, or `fortsett` → **read mode**. Anything else, including
no argument → **write mode**.

## Write mode

1. Run `git log --oneline -5` and `git status --short`. Report actual state, not
   remembered state. Uncommitted work must be named explicitly — it is the single
   most common thing a fresh session gets wrong.
2. If the next task is not clear from the session, ask **at most two** questions
   with AskUserQuestion: what is the goal, and what counts as done. Do not ask if
   the session already answered it.
3. Write `.claude/handoff.md` using the template below.
4. **Never commit.** CLAUDE.md forbids committing without approval. Suggest the
   file be included in the next milestone commit.
5. Print a three-line summary in chat, then the exact next steps: `/clear`, then
   `/handoff start`.

### Template

```markdown
# Handoff — <dato> — neste: <kort tittel på neste oppgave>

## Tilstand
Siste commit: <sha> «<melding>». Ucommittet: <kort liste eller «ingenting»>.
Verifisert: <hva som faktisk er kjørt eller sett>.
IKKE verifisert: <hva som gjenstår, eller «ingenting»>.

## Neste oppgave
Mål: <én setning>.
Ferdig når: <2–4 punkter, hvert av dem sjekkbart>.
Verifisering: <kommandoer og/eller URL-er som gir pass/fail>.

## Det du ikke finner andre steder
<Beslutninger tatt i økta som ikke er skrevet ned, blindveier («prøvde X, funket
ikke fordi Y»), feller i koden. Dette er den viktigste seksjonen.>

## Pekere
- Plan: <sti til planfil i ~/.claude/plans/>, avsnitt <navn>
- Krav.MD: <§/FR-numre som gjelder>
- Nøkkelfiler: <3–8 stier, én linje forklaring hver>
```

### Anti-rules

These are what keep the context clean. Apply them while writing, not after.

- **Do not repeat CLAUDE.md or AGENTS.md.** No working rules, commands, stack, or
  conventions in the handoff. If a rule is missing there, say so in chat — do not
  compensate by putting it in the handoff, where it will be lost at the next clear.
- **Do not repeat `Krav.MD` or the plan file.** Point with section or FR numbers.
- **Do not re-list what `git log`, `git status`, or `ls src/lib/` already shows.**
  Name a module only when it is non-obvious or changed in a surprising way.
- **Hard limit: 60 lines / ~3000 characters.** Over that, something is copied
  context. Cut the copy, not the session-specific detail.
- **Empty sections are written «ingenting», never deleted.** An empty
  "IKKE verifisert" must be a deliberate claim, not an omission.
- Prefer one concrete sentence over three careful ones. "Sortering på norsk
  krever `collate \"nb-NO\"` — uten det havner æøå sist" beats a paragraph about
  collation being important.

## Read mode (`/handoff start`)

1. Read `.claude/handoff.md`. If it does not exist, say so and stop. Do not guess
   at what the previous session was doing.
2. Read the plan file and the `Krav.MD` sections it points to. The details live
   there; the handoff only routes.
3. Run `git log --oneline -5` and `git status --short` and compare against
   "Tilstand". **Flag any drift to the user before starting work** — the handoff
   may be stale if work happened in between.
4. Restate the goal and done-criteria in 3–5 lines as confirmation.
5. If the task is non-trivial, enter plan mode first. Otherwise start working.
