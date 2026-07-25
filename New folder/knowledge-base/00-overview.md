# 00 — Overview

## What is Atrium?

**Atrium** is AfterQuery’s seller-facing marketplace. Companies and indie builders connect a **private** repository, receive an automated quality appraisal, get a **firm dollar quote**, and (if they accept) get paid so AfterQuery can use that code as training/eval raw material for frontier AI labs.

Site meta description: *“Atrium is AfterQuery's marketplace for private codebases. Connect a repository, get an automated appraisal, and receive a firm quote to sell it.”*

URL: https://atrium.afterquery.com/

## What is AfterQuery?

**AfterQuery** is an applied research lab (founded Jan 2025, YC W25, San Francisco) that builds:

- Supervised fine-tuning (SFT) datasets with reasoning traces  
- RLHF / preference data  
- Rubric + verifier-based RL  
- Tool-calling RL environments (APIs, MCP, developer tools)  
- Computer-use / browser-use trajectories  
- Code-generation datasets and custom evals  

Customers: claims every leading frontier AI lab + large enterprises.  
Expert network: claims ~100,000 verified professionals.  
Economics (company claims): ~$100M ARR run rate; $30M Series A at $300M valuation (Apr 2026).

URL: https://www.afterquery.com/

## Why Atrium exists (strategic logic)

Public GitHub is already scraped and overfit for coding agents. Labs need **private, novel, production-shaped** repositories with real history, tests, and complexity. Atrium is the **acquisition funnel** for that supply.

```
Seller private repo
        │
        ▼
   Atrium appraisal (~240 metrics)
        │
        ▼
   Firm quote → accept
        │
        ▼
   AfterQuery data products (SFT / RL / evals)
        │
        ▼
   Frontier AI labs / enterprises
```

## Seller journey (5 steps)

1. Short questionnaire (2–3 min) → preliminary estimate  
2. Connect repo (GitHub App preferred)  
3. Automated analysis (minutes; temp clone)  
4. Official firm quote (days)  
5. Accept → review → payout within **7 business days**

## What scores high vs low

| High quote signals | Low / no quote |
|--------------------|----------------|
| Multi-year production product | Thin scaffold / tutorial |
| Real commit history | Squashed / fake history |
| Tests + CI | Mostly vendored / generated |
| Novel vs public GitHub | Public mirror or thin fork |
| Clean secrets/license hygiene | Heavy PII / uncleared IP |

They **judge the code, not the company brand**. Solo projects are eligible if private and authentic.

## Naming collision

| Name | Meaning |
|------|---------|
| Atrium by AfterQuery | This product |
| AfterQuery | Parent company |
| getatrium.dev | **Unrelated** terminal/agent tool — do not mix |
