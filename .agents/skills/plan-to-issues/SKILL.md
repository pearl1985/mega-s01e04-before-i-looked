---
name: plan-to-issues
description: Split this repo's plan.md into GitHub issues with gh, one per unit of work, after a human has reviewed the split. Use when a plan is ready and has no issues yet.
---

# plan-to-issues

Turns `plan.md` into GitHub issues that workers can pick up cold. Easiest with `gh`, authenticated,
in a shell this agent can run.

## Steps

1. Read `plan.md`, `AGENTS.md` and `docs/adr/`.
2. Draft the split as a table: title · plan section · scope · done when · blocked by.
   One issue per unit of work.
3. **Stop and show the table to the human.** Publish nothing until they approve it.
4. Ask the human what every issue here must carry (fields, labels, wording), unless it is
   already written down in this session or in the repo.
5. Create each issue in dependency order, so blocked-by can cite real numbers:

   ```sh
   gh issue create --title "<title>" --body-file <tmp.md>
   ```

6. Record every issue URL from gh's output (not from memory) and reply with the list.

Closing one, with the closing comment from AGENTS.md:

```sh
gh issue close <n> -c "<closing comment>"
```

## No `gh`

Steps 1–4 hold either way. GitHub reachable another way (a connector, the REST API, the web UI):
the same issues, made that way. GitHub issues out of reach altogether: write them as files in
`docs/issues/`, format in ADR 0004, then commit and push.

## Don'ts

- Don't paste the whole plan into one issue, and don't keep issues only in chat.
- Don't invent sections the plan doesn't have. If the plan is unclear, ask.

## Issue shape (decided with the human on 2026-10-29, plan morning-digest)

Every issue made from a plan carries, in this order:

1. First line, exactly: `Source: plan.md § <n>` (the plan section, e.g. `2a`).
2. Label `plan:<plan name>` (e.g. `plan:morning-digest`), so the reviewer can sort them.
3. `## Scope`: what to build, which files or routes, copied faithfully from the plan.
4. `## Done when`: the plan's "Done when" sentence, verbatim.
5. `## Blocked by`: `none` or real issue numbers (create in dependency order).
6. `## Worker`: model and harness (strongest for logic, cheaper for views and tests).
7. `## Rules`: the repo rules the worker must keep (AGENTS.md, styleguide, ADRs) and the closing-comment shape.

An issue for a review (a preview) closes when the review is in, not when the link is sent: the reviewer reads the open issue as the cue.
