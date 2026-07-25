# 02 — Product: Atrium

## Positioning

**Tagline:** “Your codebase is worth more than you think.”  
**Promise:** Pay companies for private codebases; automated quality analysis in minutes; firm quote in days.

Atrium is **not** a hiring marketplace for annotators. It is a **corporate/data asset purchase** channel.

## Value props (seller)

- Monetize idle private IP  
- Low friction: questionnaire → connect → quote  
- No mandatory manual cleanup (they analyze automatically)  
- Clear retention story: temp clone until accept; purge if decline  

## Value props (buyer / AfterQuery internal)

- Access non-public, novel code corpora  
- Real git history for agent trajectories  
- Production complexity that synthetic data struggles to fake  
- Scale supply beyond individual expert contractors  

## Access methods

| Method | Notes |
|--------|--------|
| GitHub App | **Recommended** — no long-lived token to manage |
| Read-only access token | Scope to that repo only; used once and discarded (per FAQ) |
| `.zip` upload | Must include **`.git` history** |

**Gate:** They verify the repository is **private**. Public code is not purchased.

## Lifecycle of code on their systems (FAQ)

1. Temporary working copy created  
2. Automated analysis runs (quality, scale, git history, tests, secrets…)  
3. Clone deleted after analysis  
4. **Nothing retained long-term unless quote accepted and delivery taken**  
5. If decline or no deal → purge  

After accept: internal review → approval → payout; notifications at each step.

## Timing

| Stage | Timing |
|-------|--------|
| Questionnaire | 2–3 minutes |
| Preliminary estimate | Immediate |
| Analysis | Minutes |
| Firm quote | “Shortly” / days |
| Payout after accept | Within **7 business days** |

## Estimator (marketing UI)

Inputs:

- Data type: Private Codebase (others coming soon)  
- Approximate volume: Small / Medium / Large / Very Large  
- Time range of data: &lt;1 year / 1–2 / 2–4 / 4+ years  
- Number of employees: Solo → 500+  

Example ballpark shown on landing for a common small selection: **$1,500 – $4,500**. Treat as illustrative only.

## Multi-asset future

Questionnaire already anticipates multiple data types; FAQ says each type can contribute to total payout. Code is live; SaaS exports are roadmap (see `06-platforms-roadmap.md`).

## Relationship to expert network

Separate supply channel:

| Channel | Who | What |
|---------|-----|------|
| Expert network | Individual professionals | Reasoning traces, rubrics, demos, preferences |
| Atrium | Companies / repo owners | Whole private codebases / enterprise corpora |

Do not conflate “sell your codebase” with “get hired as an AfterQuery expert.”
