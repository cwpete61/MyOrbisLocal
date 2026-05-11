---
name: marketing-copy
description: Generate user-facing copy for MyOrbisLocal using the project's marketing style guide — masters of direct-response (Caples, Halbert, Wiebe, Kennedy, Furey, Schwartz, Sugarman, Miller) + Cialdini's 7 principles. Always picks a framework, an aggression tier, an awareness stage, and an angle before writing a single line.
metadata:
  tags: marketing, copy, copywriting, persuasion, style-guide, myorbislocal
---

## When to use

Use this skill whenever the user asks for **any user-facing copy** for the MyOrbisLocal platform. That includes:

- Marketing site pages (`site/index.html`, `site/es/index.html`, future product pages)
- Tenant outbound emails (cold, warm, onboarding sequences)
- Partner pitch material, partner-portal copy, partner marketing kits
- OrbisVoice product section copy (it's a product under MyOrbisLocal)
- Video scripts (the `orbisvoice-promo-video` Remotion project + future cuts)
- Dashboard taglines, empty states, hero microcopy
- Ad creative (Meta, Google, LinkedIn)
- Push notification copy, transactional email subject lines

**Do NOT use this skill for:** internal admin / audit / error copy. That's plain + Conservative + persuasion-irrelevant. Just write it directly.

Voice triggers (speech-to-text aliases): "write copy", "marketing copy", "rework the home page", "draft an email", "write a hero", "write a CTA", "write an ad", "write a script", "write a tagline".

Proactively suggest this skill (do NOT write copy directly) when the user says "rewrite this page," "make this punchier," "generate an email for X," "what should the headline say," or asks for any persuasion-bearing text.

## The Iron Rule

**Before writing a single line of copy, Read [docs/marketing-style-guide.md](../../../docs/marketing-style-guide.md) from the project root.** The guide is 445 lines and 30KB. If you skip it, you produce generic LLM hedging copy and lose the framework-level consistency the user is paying for. This rule has no exceptions.

If the guide is missing or unreadable, stop and tell the user — do not improvise.

## Workflow (every invocation)

### 1. Read the guide

Use the Read tool on `docs/marketing-style-guide.md`. Internalize:

- Section: **The Aggression Spectrum** (lines ~34-52) — Conservative / Balanced / Direct / Aggressive
- Section: **Master copywriters** (lines ~53-131) — when to pull from each
- Section: **Frameworks — when to use which** (lines ~132-154) — the default stack
- Section: **Cialdini's 7 principles** (lines ~155-172) — psychology baseline
- Section: **Anti-patterns** (lines ~307-325) — the don't-do list
- Section: **Voice rules per surface** (lines ~326-342) — per-channel constraints

### 2. Identify the four parameters (ask if not specified)

Every copy task needs four explicit choices. Use AskUserQuestion if any are unclear:

| Parameter | Possible values | Default |
|---|---|---|
| **Surface** | marketing site / cold email / warm email / partner pitch / dashboard / video script / ad / push | Required — ask |
| **Aggression tier** | Conservative / Balanced / Direct / Aggressive | Balanced |
| **Awareness stage** (Schwartz) | Unaware / Problem Aware / Solution Aware / Product Aware / Most Aware | Required — ask if cold; default Solution Aware for warm |
| **Framework** | PAS / AIDA / StoryBrand 7-step / 4Ps / Caples headline / Halbert sales-letter / Sugarman slippery-slope | Per the guide's "Default stack" table; ask only if ambiguous |

If the user has set a tier on a tenant/partner (`BusinessProfile.aggressionTier`), respect it. Don't override without permission.

### 3. Stack 3-5 Cialdini principles

Every meaningful piece needs 3-5 of the seven (Reciprocity, Commitment & Consistency, Social Proof, Authority, Liking, Scarcity, Unity). Workhorse stacks from the guide:

- **Cold traffic / cold email:** Reciprocity + Social Proof + Authority + Scarcity
- **Warm traffic / nurture email:** Commitment + Unity + Scarcity
- **Pricing page / decision moment:** Social Proof + Authority + Scarcity + Anchoring

State which principles you're stacking before writing — out loud, in your scratch — so it's a deliberate choice and not accidental.

### 4. Write the copy

Generate **English first**, then **Spanish (LatAm, tú-form)** per the bilingual rule. Apply the framework end-to-end, not as a vague flavor.

Citations: every statistic gets a source chip (Forbes / HBR / BIA-Kelsey / industry source). No orphan stats. No "studies show." If you can't cite it, cut it.

Stories: specific or labeled hypothetical. Never invent quoted customers. "Sarah's dental office in Allentown" reads as real — use it only when it is real, or prefix with "imagine."

Urgency: enforceable only. No perpetual-last-day deadlines. If the deadline doesn't actually trigger something, kill it.

### 5. Self-check against the anti-patterns list

Before showing the user, scan your draft for the explicit anti-patterns in the guide (lines ~307-325):

- LLM hedging ("might," "could potentially," "in some cases")
- Owner-centered openings ("We at MyOrbisLocal believe…")
- Adjective stacking ("powerful, robust, innovative, cutting-edge")
- Fake urgency
- Generic social proof ("Loved by thousands of businesses")
- Walls of text (paragraphs > 3 sentences on the marketing site)
- Headlines that explain instead of provoke

If you find one, fix it before showing the user. Don't ship a draft you already know has a flagged pattern.

### 6. Present with reasoning

When showing copy, lead with one sentence on the framework + tier + awareness stage + principles stacked. The user should be able to redirect on the framework choice (the lever) without having to read the whole draft to figure out why it landed the way it did.

Format:
```
Framework: PAS · Tier: Balanced · Awareness: Problem Aware · Cialdini: Social Proof + Authority + Scarcity

[the copy]
```

## Per-surface quick reference

The guide has full per-surface voice rules at lines ~326-342. Quick shortcuts:

- **Hero on the marketing site:** Default to PAS for tight pain-first heroes. Caples-style headline formula. ≤ 12 words. One verb. No corporate adjectives.
- **Full home-page narrative:** StoryBrand 7-step. The customer is the hero, not us.
- **Cold email (first touch):** PAS. Subject line follows Wiebe's curiosity-gap or specificity pattern. Body ≤ 80 words.
- **Nurture email (touch 2-5):** Furey story-driven format. Open with a story, land on the offer in the last third.
- **Long-form sales letter / pitch page:** Halbert / Schwartz. AIDA at the macro level, 4Ps inside each section.
- **Video script:** PAS for short cuts (≤ 60s), StoryBrand for explainers (60-180s). Hook in the first 3 seconds, payoff in the last 5.
- **Dashboard tagline / empty state:** Conservative tier always. Plain, helpful, ≤ 8 words. Sugarman's "next sentence" idea — every line earns the next read.
- **Ad creative:** Hardest surface. Wiebe customer-voice mining + Caples headlines + ruthless cut to the offer. Tier matches the channel (Meta = Direct OK, LinkedIn = Balanced).

## Bilingual rule (always applies)

Every copy task ships EN + ES (LatAm Spanish, *tú*-form). The guide's "Bilingual considerations" section (lines ~290-306) covers LatAm-specific patterns: family/community framing, longer trust-building before the offer, currency stays USD ($), brand name stays English (`MyOrbisLocal`).

Universal references that stay English in both: brand name, third-party provider names (Stripe, Google), URLs/paths, all-caps system codes, template tokens (`{firstName}`).

Don't generate EN, ship, and "translate later." Generate together — the Spanish often surfaces awkwardness in the English that machine translation hides.

## Living document

The guide has a Changelog (lines ~414-425). When a real campaign teaches us something new — what converted, what didn't, a new framework worth adding — propose a guide update along with the copy delivery. Don't update the guide silently; flag it so the user can confirm.

## Verification (self-test)

After every invocation, before the turn ends, confirm:

- [ ] I read `docs/marketing-style-guide.md` this turn (or earlier in the same session and the guide hasn't changed)
- [ ] I named the framework, tier, awareness stage, and Cialdini stack in the response
- [ ] I generated EN + ES
- [ ] Every stat has a citation chip
- [ ] No anti-pattern from the don't-do list survived in the draft
- [ ] No invented quoted customer or unenforceable deadline

If any box is unchecked, fix it before ending the turn.
