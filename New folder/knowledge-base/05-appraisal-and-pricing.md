# 05 — Appraisal and pricing

## Two-stage pricing

| Stage | What it is | Binding? |
|-------|------------|----------|
| Preliminary estimate | From questionnaire + estimator UI (volume, age, company size) | No — ballpark |
| Firm quote | Pricing algorithm on **actual** repo content after connect/upload | Yes (until they say otherwise in deal docs) |

After accept: human review → approval → payout.

## Stated metric families (~240 metrics)

From FAQ:

1. **Scale** — authored lines of code; excludes vendored and generated files  
2. **Code quality and complexity**  
3. **Commit history authenticity**  
4. **Novelty versus public code**  
5. **Documentation coverage**  
6. **Hygiene** — secrets, license issues  

Also mentioned in process copy: tests, CI, completeness.

## Explicit ranking (FAQ)

**Top of market:** production products with years of history, tests, and CI; substantial, novel, well-built.

**Bottom:** small or derivative projects → small or no quotes.

**Eligibility floor:** genuinely private + real commit history; any size from solo to decade-old product; they judge code not company.

## Estimator dimensions (UI)

- Approximate volume: Small / Medium / Large / Very Large  
- Time range: &lt;1y · 1–2y · 2–4y · 4+y  
- Employees: Solo · 2–10 · 11–50 · 51–200 · 201–500 · 500+  
- Data type: Private Codebase (more later)  

**Example ballpark on site:** $1,500 – $4,500 for a common small selection — **not a guarantee**.

## Payout economics (known)

- Depends on data type, volume, time range, company size (FAQ)  
- Multiple data types can stack into total payout  
- Payout completes within **7 business days** after accept (FAQ)  

Unknown publicly: exact $/LOC formula, novelty scoring method, negotiation room, exclusivity terms — live in deal paperwork.

## Practical inference for agents

When advising sellers, weight:

```
quote_potential ≈ f(
  authored_loc,
  years_of_authentic_history,
  production_maturity,   # tests, CI, real users
  novelty_vs_public,
  hygiene,               # secrets/licenses reduce friction
  legal_clarity          # authority to sell
)
```

Do not invent numeric payouts beyond estimator/FAQ language.
