# 04 — Seller playbook

## Go / no-go checklist

Proceed only if all are true:

- [ ] You own the IP **or** have written authority to sell/license it  
- [ ] Repos are private and not mirrored publicly  
- [ ] Code is original enough (not thin fork / tutorial clone / mostly vendored)  
- [ ] You accept that accepting a quote likely means AfterQuery takes delivery for AI-training commercial use  
- [ ] You understand secrets/PII will be scanned — scrub when possible  

If any fail → **stop**. Get legal/compliance sign-off.

## Maximize quote quality

| Do | Don't |
|----|--------|
| Submit production products with multi-year history | Submit demos, homework, boilerplate generators |
| Keep real `.git` history (required for zip) | Rewrite history to fake longevity |
| Prefer repos with tests + CI | Ship only `node_modules` / generated dumps |
| Scrub secrets and customer PII | Assume their scanner makes risk zero |
| Use GitHub App | Leave broad PATs lying around |
| Describe LOC, stack, age, CI concretely | Vague “big SaaS codebase” |

## Prep steps (optional but smart)

1. Rotate any credentials that ever appeared in git  
2. Remove `.env`, dumps, customer exports  
3. Know third-party license obligations  
4. Choose the valuable product repos (skip noise)  
5. Ensure privacy settings and no public mirrors  

They say cleaning is **not required** — still do hygiene for deal speed and risk.

## Questionnaire tips

Write metric-led descriptions, e.g.:

> 3 private production repos · ~280k authored LOC TypeScript/Go · 6 years history · pytest + GitHub Actions · B2B SaaS billing + admin · not public forks.

Set authorization honestly (`Yes / Pending / Need to check`).  
Referral for this workspace: **`NCB4YP`**.

## Expectation setting

- Estimator ≠ firm quote  
- Small/derivative may get **small or no** quote (their words)  
- Multi-datatype stacking grows as intakes open  
- Opportunity cost: selling may end exclusivity of that corpus — read the purchase agreement before accept  

## Red flags

- Individual uploading employer code without approval  
- Public repos  
- Copy-paste OSS with thin wrappers  
- Treating FAQ as a full legal contract  

## How they’ll likely use the code

Consistent with AfterQuery products (not always spelled out on Atrium):

- Code-gen SFT / debug traces  
- Repo-level coding-agent environments  
- Novelty-rich evals vs public SWE benches  
- Enterprise coding-agent post-training for lab customers  
