# 08 — Legal and risk

**Not legal advice.** This summarizes public site language for decision support.

## Authorization (critical)

FAQ: indicate authorization status in questionnaire; if unsure, check company legal/compliance before uploading; they proceed once authorization is confirmed.

**Agent rule:** refuse to help craft submissions that clearly involve unauthorized employer/client IP.

## Secrets and sensitive data

- They scan for API keys, credentials, tokens, PII and flag for reviewers  
- Claim: code only seen by their team for appraisal; never published or shared  
- Still: rotate secrets, remove dumps — scanners miss things; git history retains deleted secrets  

## Retention

- Temp clone for analysis → deleted  
- Long-term retention only if quote **accepted** and delivery taken  
- Decline / no proceed → purge (FAQ claim)  

## Parent Terms of Service (afterquery.com, last updated March 2024)

- Services: AI training data and related solutions  
- IP: materials you provide remain your property **subject to licenses needed to provide services**  
- Payments: fees in separate agreements; generally non-refundable unless written otherwise  
- Liability caps and Delaware governing law  
- Contact: founders@afterquery.com  

**Implication:** Atrium purchases almost certainly involve a **separate purchase/license agreement** at quote acceptance. FAQ ≠ contract. Review deal docs before accept.

## Privacy policy highlights (March 2024)

- Collects name, email, phone, business info from interest forms  
- Uses for operate/improve/communicate  
- Third parties may process on their behalf  
- Rights: access, correct, delete, object, limit  
- No absolute security guarantee  

## Seller risk register

| Risk | Mitigation |
|------|------------|
| Unauthorized IP sale | Written authority; employment/contractor agreements |
| Customer PII in repo | Scrub; minimize; legal review |
| Secret leakage | Rotate; secret scanning locally before share |
| License contamination (GPL etc.) | Inventory third-party licenses |
| Loss of exclusivity after sale | Negotiate/review license scope in deal |
| Overestimating payout | Treat estimator as ballpark only |
| Confusing products | Not getatrium.dev |

## Compliance claims (third-party reports)

ISO 27001 and SOC 2 Type II mentioned in Sacra coverage as enterprise enablers — verify current status on vendor security pages / questionnaires if needed for your compliance team.
