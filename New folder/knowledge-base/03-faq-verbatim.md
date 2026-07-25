# 03 — FAQ (verbatim)

Extracted from Atrium product JavaScript bundle on atrium.afterquery.com (researched 2026-07-21). Prefer this file when quoting policy.

---

### What types of data are you looking for?

Right now we buy private codebases (company repositories on GitHub, with GitLab and Bitbucket support coming soon). We'll shortly be purchasing other enterprise data too, like project management, communications, documents, and CRM. You can ask to be notified when we do.

### How do you access my codebase?

Connect your repository through our GitHub App (recommended, with no token to manage), or share a read-only access token scoped to just that repo. We first verify the repository is private, since we only buy code that isn't already public, then run automated quality analysis on a temporary clone. Tokens are used once and discarded, and the clone is deleted after analysis. Nothing is retained unless you accept a quote.

### What quality checks do you run on codebases?

Our analysis engine profiles your repository across roughly 240 metrics: scale (authored lines of code, excluding vendored and generated files), code quality and complexity, commit history authenticity, novelty versus public code, documentation coverage, and hygiene (secrets, license issues). We judge the code, not the company. Original private code is welcome at any size, from a solo project to a decade-old product. What earns the highest quotes is substantial, novel, well-built code: production products with years of history, tests, and CI sit at the top, while small or derivative projects earn small or no quotes. The repo just has to be genuinely private (not already on public GitHub) and have real commit history.

### How much can I earn?

Payouts depend on data type, volume, time range, and company size. Use our estimator to get a ballpark range instantly, then submit your data for an official quote based on your actual dataset.

### How does pricing work?

You'll receive a preliminary estimate immediately after filling out the questionnaire. Once you submit your codebase, our pricing algorithm analyzes the actual content (quality, volume, and completeness) to generate a firm dollar quote.

### What happens to my codebase after I submit it?

We make a temporary working copy to run automated analysis (code quality, scale, git history, tests), then delete that copy. We don't rewrite or redistribute your source; we grade the real code. Nothing is retained long-term unless you accept a quote and we take delivery. If you decline, or we don't proceed, everything is purged from our systems.

### How are secrets and sensitive data handled?

Our analysis scans your codebase for secrets and sensitive data (API keys, credentials, tokens, personal information) and flags anything it finds for our reviewers. Your code is only ever seen by our team for appraisal; it is never published or shared.

### What if I'm not sure I'm authorized to share this data?

You can indicate your authorization status in the questionnaire. If you're unsure, we recommend checking with your company's legal or compliance team before uploading. We can proceed once you confirm authorization.

### How long does the process take?

The questionnaire takes 2-3 minutes and you'll get a preliminary estimate immediately. After uploading data, you'll receive an official quote shortly. Once accepted, payout completes within 7 business days.

### What happens after I accept a quote?

After you accept a quote, our team reviews the data. Once approved, you get paid. We'll notify you at each step of the process.

### Do I need to clean my code first?

No. Connect your private repository through our GitHub App (recommended) or a read-only access token, or upload a .zip of the repo including its .git history. We handle the analysis and quality checks automatically.

### Can I submit data from multiple tools?

Absolutely. You can select multiple data types in the questionnaire and upload files from different tools. Each data type contributes to your total payout.
