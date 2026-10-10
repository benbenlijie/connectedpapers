# Distribution: where to list CiteDuo, in what order, and what will get it rejected

**Scope.** Preparation only. Nothing here has been submitted, and nothing in this file authorises
mass submission. Every rule below was read off a live page on **2026-10-10**; the URL is cited
inline. Where a page could not be read (Cloudflare, JS-only forms, ambiguous heading), the rule is
marked **unverified** instead of guessed.

**Project facts used throughout** (from `README.md` in this repo):

- **CiteDuo** — self-hosted, local-first academic paper explorer. Repo: `https://github.com/benbenlijie/citeduo`
  (currently **HTTP 404 — not public yet**; everything below assumes it is public at launch).
- Distinguishing feature: explains *how two papers are connected*, hop by hop, with evidence-ranked
  edge types (direct reference > citation > bibliographic coupling > related work > embedding similarity).
- Also: PageRank-weighted citation graphs, Louvain communities, timeline playback, in-app arXiv HTML
  reading with per-paragraph bilingual translation, retrieval-grounded AI reading assistant.
- Stack: Bun + React 18 + SQLite, single process, no account, no cloud. **MIT**. Live demo:
  `https://watchdeep.net/paper-demo/`. **v0.1.0**, solo developer, no funding, no company.

Approximate star counts were read from `https://img.shields.io/github/stars/<owner>/<repo>.json`
(the GitHub REST API is rate-limited from this machine). Treat them as approximate and refresh
before acting.

---

## Three findings that change how this channel must be worked

**1. awesome-selfhosted now explicitly forbids machine-written entries.** Its contributing guide opens
with a notice addressed to AI agents: *"Do not create, submit, or modify GitHub Issues or Pull
Requests in this repository."* / *"Do not … Write the text of an entry (`software/*.yml` …) that a
person will then submit as their own."* / *"Do not … Check the 'The submission was done by a human,
not a machine/LLM' box."*
([CONTRIBUTING.md](https://github.com/awesome-selfhosted/awesome-selfhosted-data/blob/master/CONTRIBUTING.md))
Consequence for this document: for that one list, **no ready-to-paste entry is provided here.** The
required fields are listed and the author must write and submit the YAML themselves. This is a
deliberate omission, not an oversight.

**2. The same list also says:** *"Machine/LLM-generated contributions are not allowed and will result
in a ban."* ([same page](https://github.com/awesome-selfhosted/awesome-selfhosted-data/blob/master/CONTRIBUTING.md))

**3. Hacker News bans generated text outright.** *"Please don't put generated text in HN posts. Write
your text yourself—HN is for sharing between humans."* and *"please don't automate posting."*
([newsguidelines.html](https://news.ycombinator.com/newsguidelines.html))
Consequence: this file gives the required **title format** and the rules, but deliberately does not
supply a Show HN body to paste. Write it yourself on the day.

Also relevant: sindresorhus/awesome states *"Fully AI-generated pull requests are not accepted."*
([pull_request_template.md](https://github.com/sindresorhus/awesome/blob/main/pull_request_template.md))

**Operating rule for everything below: this document is research, not submission copy. You write the
words, you open the PR, you answer the maintainer.**

---

# PART 1 — Candidate lists, directories and platforms

Grouped by verdict. "Payoff" is an honest estimate, not a promise.

## 1A. Genuine fits worth doing

### awesome-selfhosted — 325k ★ ⚠️ time-gated
- **Site:** https://github.com/awesome-selfhosted/awesome-selfhosted (the list you would appear in);
  **data repo:** https://github.com/awesome-selfhosted/awesome-selfhosted-data (~1.2k ★)
- **Mechanism (exact):** the markdown list is generated. You add a **new YAML file** at
  `software/<kebab-case-name>.yml` in the *data* repo and open a PR. *"Create a new `software/software-name.yml`
  file … based on the template … Please use kebab-case for file naming."* / *"If you are not comfortable
  sending a pull request, please open a new issue."*
  ([CONTRIBUTING.md](https://github.com/awesome-selfhosted/awesome-selfhosted-data/blob/master/CONTRIBUTING.md))
- **Required fields** ([addition.md](https://github.com/awesome-selfhosted/awesome-selfhosted-data/blob/master/.github/ISSUE_TEMPLATE/addition.md)):
  `name`, `website_url`, `source_code_url`, `description` (*"shorter than 250 characters, sentence
  case"*), `licenses` (from `licenses.yml`), `platforms` (from `platforms/`), `tags` (from `tags/`),
  optional `depends_3rdparty`, `demo_url`, `related_software_url`.
  A real rendered example, for shape only:
  ```yaml
  name: Paperless-ngx
  website_url: https://docs.paperless-ngx.com/
  description: Scan, index, and archive all of your paper documents with an improved interface (fork of Paperless).
  licenses:
    - GPL-3.0
  platforms:
    - Python
    - Docker
  tags:
    - Document Management
    - Archiving and Digital Preservation (DP)
  source_code_url: https://github.com/paperless-ngx/paperless-ngx
  demo_url: https://demo.paperless-ngx.com/
  ```
  ([software/paperless-ngx.yml](https://github.com/awesome-selfhosted/awesome-selfhosted-data/blob/master/software/paperless-ngx.yml))
- **Stated criteria (verbatim, [PR template](https://github.com/awesome-selfhosted/awesome-selfhosted-data/blob/master/.github/PULL_REQUEST_TEMPLATE.md)):**
  - *"Submit one item per pull request."*
  - *"The submission was done by a human, not a machine/LLM."*
  - *"Any software project you are adding is actively maintained."*
  - *"Any software project you are adding was first released more than 4 months ago."*
  - *"Any software project you are adding has working installation instructions."*
  - *"Comments and unused optional fields have been removed."*
  - *"`Demo` links should only be used for interactive demos, i.e. not video demonstrations."*
  - *"You understand that your Pull Request will be merged at least ~1 week after approval."*
  - Description style rules: avoid redundant terms such as *"open-source, free, self-hosted"*; prefer
    shorter forms; add `(alternative to $PRODUCT)` if you present it as one.
- **Fit check:** MIT is fine — the list is Free/Open-Source only and non-free goes to `non-free.md`
  ([README](https://github.com/awesome-selfhosted/awesome-selfhosted/blob/master/README.md));
  `licenses.yml` contains `identifier: MIT`
  ([licenses.yml](https://github.com/awesome-selfhosted/awesome-selfhosted-data/blob/master/licenses.yml)).
  It is a web app, not a desktop/CLI app, so it escapes the "What does not qualify" list. **Weak
  spot:** there is no reference-management or scholarly-search tag. The closest existing tags are
  `Knowledge Management Tools` (*"the collection of methods relating to creating, sharing, using and
  managing the knowledge and information"*,
  [tags/knowledge-management-tools.yml](https://github.com/awesome-selfhosted/awesome-selfhosted-data/blob/master/tags/knowledge-management-tools.yml)),
  `Generative Artificial Intelligence (GenAI)`
  ([tags/generative-ai.yml](https://github.com/awesome-selfhosted/awesome-selfhosted-data/blob/master/tags/generative-ai.yml)),
  and `Miscellaneous`. There is also no `Bun` platform — the platforms directory has `nodejs.yml`,
  `deno.yml`, `javascript.yml`
  ([platforms/](https://github.com/awesome-selfhosted/awesome-selfhosted-data/tree/master/platforms)),
  so `Nodejs` is the nearest *honest* mapping, and that mismatch is worth flagging in the PR rather
  than hiding.
- **Author self-submission?** No rule forbids it. But the entry must be authored by a human
  (finding #1 above) — so **do not paste a generated YAML here**.
- **Payoff:** high. 325k ★ is the single biggest self-hosted audience there is, and a permanent
  backlink. Worth waiting for.
- **Verdict: DO IT — but only after v0.1.0 is more than 4 months old.**

### graphgeeks-lab/awesome-graph-universe — 167 ★
- **Repo:** https://github.com/graphgeeks-lab/awesome-graph-universe
- **Mechanism:** PR to `README.md` (fork → branch → PR).
  *"Contributions are welcome! … feel free to submit a pull request or open an issue."* /
  *"Please follow the [contribution guidelines](CONTRIBUTING.md)"*
  ([README](https://github.com/graphgeeks-lab/awesome-graph-universe/blob/main/README.md) /
  [CONTRIBUTING.md](https://github.com/graphgeeks-lab/awesome-graph-universe/blob/main/CONTRIBUTING.md)).
  Guidelines ask for a *"detailed description in your PR"*, *"clear and concise commit messages"*, and
  branch names like `add_XXX`.
- **Exact section:** `## Graph Visualization` → `### Apps`. This is a real app section, which is why
  this list is a strong structural fit despite the small star count.
- **Exact entry format, copied from the README** (note the two shields.io badges before the prose,
  and that entries in this section are alphabetical):
  ```
  - [Gephi](https://gephi.org/) ![Purpose](https://img.shields.io/badge/purpose-networkAnalysis-orange)  visualization and exploration software for all kinds of graphs and networks. Gephi is open-source and free.
  - [G.V()](https://gdotv.com) - A Graph Database Client for Labeled Property Graph databases that enables users to write and run Gremlin, Cypher & GQL queries against a graph database, then visualize the results using various formats (graph visualization, JSON, tables, etc).
  ```
  ([README.md](https://github.com/graphgeeks-lab/awesome-graph-universe/blob/main/README.md))
- **Stated criteria beyond "be good":** none found (no star minimum, no age rule, no alphabetical rule
  stated in CONTRIBUTING). "Alphabetical within the section" is observable in the file, not stated —
  worth following anyway.
- **Author self-submission?** Silent. *"We welcome contributions from everyone!"*
- **Payoff:** low-moderate. 167 ★ means little referral traffic; the value is the backlink and being
  in a topical index a graph-tooling person may actually browse.
- **Verdict: DO IT early — clean fit, near-zero rejection risk.**

### briatte/awesome-network-analysis — 4.1k ★
- **Repo:** https://github.com/briatte/awesome-network-analysis
- **Mechanism:** PR to `README.md`. *"Please contribute to it by sending pull requests or by fixing
  its issues."* ([CONTRIBUTING.md](https://github.com/briatte/awesome-network-analysis/blob/master/CONTRIBUTING.md))
- **Exact section:** `## Software` (there is also `Review Articles → Bibliographic, Citation and
  Semantic Networks`, which is papers, not software).
- **Exact entry format, copied from the README** — note the three spaces after the dash and the
  Title-Cased name:
  ```
  -   [Circos](http://circos.ca/) - Cross-platform program to produce circular layouts of network data, written in Perl.
  -   [Cytoscape](http://www.cytoscape.org/) - Cross-platform Java program to build, analyze and visualize networks. Also a JavaScript library.
  ```
  ([README.md](https://github.com/briatte/awesome-network-analysis/blob/master/README.md))
- **Stated criteria (verbatim, [CONTRIBUTING.md](https://github.com/briatte/awesome-network-analysis/blob/master/CONTRIBUTING.md)):**
  - *"All resources are listed alphabetically."*
  - *"All titles are Title Cased, Chicago-style."*
  - *"Default spelling is U.S. English."*
  - *"Do not use copyright or trademark symbols", "quotes around titles", "monospace text for software names".*
  - *"If you contribute to this list, please add your name to the copyright waiver at the end of the
    list, with an optional link to your personal homepage, GitHub profile, or social media profile."*
  - Inclusion bar comes from the Awesome Manifesto: *"Only awesome is awesome"* and *"Comment on why
    something is awesome"*; a wiki of
    [rejected content](https://github.com/briatte/awesome-network-analysis/wiki/rejected-content)
    exists — read it before opening the PR.
- **Author self-submission?** Silent. The copyright-waiver step implies contributors add their own name.
- **Honest fit caveat:** this list's `Software` section is network-analysis *tooling* (Gephi, Cytoscape,
  Pajek, UCINET, graph libraries). CiteDuo is a domain application that happens to compute and draw
  citation networks. It is defensible but it is the kind of entry a maintainer can reasonably call
  off-topic. Expect scrutiny.
- **Payoff:** moderate. 4.1k ★, academic/network-science readership, permanent backlink.
- **Verdict: DO IT, but write the entry defensively** — lead with the network-analysis capability
  (PageRank weighting, Louvain communities, edge-type-ranked paths), not with "paper search".

## 1B. Real but conditional or low-value

### steven2358/awesome-generative-ai — 13k ★
- **Repo:** https://github.com/steven2358/awesome-generative-ai ·
  [CONTRIBUTING.md](https://github.com/steven2358/awesome-generative-ai/blob/main/CONTRIBUTING.md)
- **Mechanism:** PR; *"Add links through pull requests or create an issue to start a discussion."*
- **Hard criterion:** main list requires **≥1,000 stars** — *"High general interest and significant
  followers: … (at least 1,000)"* — or that it is *"Personally interesting to the maintainer"*.
  Everything else goes to `DISCOVERIES.md`: *"If your project does not fulfill any of these criteria,
  it will be added to the Discoveries list."*
- **Format (verbatim):** *"Use the following format: `[ProjectName](Link) - Description.` Open-source
  projects should include the tag #opensource at the end."*
- **Author self-submission?** Silent. Maintainer notes *"I review each contributed project by hand."*
- **Fit problem:** CiteDuo is not a generative-AI project; it *uses* an LLM for one feature. Submitting
  to the main list is padding; DISCOVERIES.md is the only defensible target.
- **Payoff:** main list would be good; DISCOVERIES.md is a backlink and little else.
- **Verdict: defer.** Eligible only for DISCOVERIES.md, and the fit is weak enough to be a fair
  rejection.

### mahseema/awesome-ai-tools — 6.4k ★
- **Repo:** https://github.com/mahseema/awesome-ai-tools
- **Mechanism:** PR to `README.md`. No `contributing.md` exists (404 on
  `.../main/contributing.md`), so the only stated guidance is in the README.
- **Self-submission explicitly invited:** *"Feel free to contribute and also submit your AI tools on
  altern.ai for free"* and *"Eager to contribute or feature your product? Send a PR to this repo—it's
  free!"* ([README.md](https://github.com/mahseema/awesome-ai-tools/blob/main/README.md))
- **Honest read:** the README's "Editor's Choice" block is full of affiliate links
  (`affiliate.notion.so`, `get.murf.ai`, `try.sanebox.com`) and the list is a funnel into the
  maintainer's own `altern.ai` directory and newsletter. It accepts self-promotion *by design*. A
  listing here is close to buying a low-quality backlink, and CiteDuo does not belong in an AI-tools
  list on the strength of one assistant feature.
- **Payoff:** a backlink of questionable value, occasional referral traffic.
- **Verdict: SKIP** — this is list-padding, in both directions.

### mancano-tales/awesome-open-source-research-tools — 0 ★
- **Repo:** https://github.com/mancano-tales/awesome-open-source-research-tools
- **Mechanism:** PR that edits `data/tools.json` (the stated SSOT) and regenerates the READMEs:
  *"Add your entry into `data/tools.json` with the required metadata (`id`, `name`, `url`, `categoryId`,
  `country`, `maintainer`, `institution`, `description` in EN and PT, and `tags`) … then `npm run
  build-readmes` … `npm test` … open a pull request."*
  ([CONTRIBUTING.md](https://github.com/mancano-tales/awesome-open-source-research-tools/blob/main/CONTRIBUTING.md))
- **Checklist (verbatim):** open source under a recognized license; actively maintained; *"Supports
  some part of the research lifecycle"*; minimal documentation; not redundant.
- **Fit:** genuinely good — it has `Literature Review & Synthesis`, `Reference & Citation Management`
  and `AI & Agentic Research Tooling` sections, and the list is *"method- and discipline-agnostic"*.
- **Author self-submission?** Silent; criteria are objective rather than taste-based.
- **Payoff:** **near zero — 0 stars.** This is a brand-new list with no audience. It costs a PR to be
  in on the ground floor; that is all it buys.
- **Verdict: optional, last.** Do it only if the PR is cheap and you want the early-entry position.

### napsternxg/awesome-scholarly-data-analysis — ≈203 ★
- **Repo:** https://github.com/napsternxg/awesome-scholarly-data-analysis
- **Mechanism:** PR to `README.md`. **Rules unverified** — there is no `CONTRIBUTING.md`; the README
  ends with a `# Contributions` section that only thanks people.
- **Format (verbatim from the `## Visualizations` section, plain `*` bullets with no descriptions):**
  ```
  * [Rexplore](https://technologies.kmi.open.ac.uk/rexplore/)
  * [VOSviewer](http://www.vosviewer.com)
  * [CitNetExplorer](http://www.citnetexplorer.nl/)
  ```
  ([README.md](https://github.com/napsternxg/awesome-scholarly-data-analysis/blob/master/README.md))
- **Fit:** domain-wise the best title match on this page ("bibliometrics, citation analysis"), and
  CiteDuo would sit alongside CitNetExplorer/CiteSpace. But the list is largely datasets and papers
  from ~2016 and I could not verify it is still maintained.
- **Author self-submission?** Silent.
- **Payoff:** low. Small, likely stale, but a very on-topic backlink (probably the single most
  relevant *list* to CiteDuo).
- **Verdict: maybe.** Try it late; expect silence rather than rejection.

### dh-tech/awesome-digital-humanities — 418 ★
- **Repo:** https://github.com/dh-tech/awesome-digital-humanities
- **Mechanism + rules (verbatim, [CONTRIBUTING.md](https://github.com/dh-tech/awesome-digital-humanities/blob/main/CONTRIBUTING.md)):**
  *"Additions: restricted to addition of one new entry per pull-request."* · *"a short pitch is
  included in the pull-request description"* · *"the contents are sorted alphabetically"* · *"The
  addition you proposed is NOT part of everything that did not make it into the list."*
- **Format:** `- [Name](url) - Description.` (verified in the `## Visualization` section, which lists
  Gephi, RAWGraphs, Palladio…).
- **Fit:** the list is *"Software for humanities scholars using quantitative or computational
  methods."* CiteDuo is discipline-agnostic. Adding it here would be padding.
- **Verdict: SKIP.**

### selfh.st — directory + newsletter
- **Site:** https://selfh.st/ · **apps directory:** https://selfh.st/apps/ · **submit page:**
  https://selfh.st/submit/
- **Mechanism:** there is a *"Submit Content"* page in the nav
  ([about page](https://selfh.st/about/)), and an apps directory described as *"a directory of
  self-hosted applications and software for easy browsing and discovery"*. The submit page rendered
  only its shell for me — the actual form is loaded by script — so **the fields and any criteria are
  unverified.**
- **Author self-submission?** Unverified.
- **Payoff:** good *audience* fit (Self-Host Weekly newsletter + app directory is exactly CiteDuo's
  user), unknown acceptance rate.
- **Verdict: TRY — open the page in a browser and fill it in yourself.**

## 1C. Platforms (not lists)

### Hacker News — "Show HN"
- **Rules:** [showhn.html](https://news.ycombinator.com/showhn.html) ·
  [newsguidelines.html](https://news.ycombinator.com/newsguidelines.html)
- **Mechanism:** submit a story whose title **begins with "Show HN"** — *"To post, submit a story
  whose title begins with 'Show HN'."*
- **Eligibility (verbatim):** *"Show HN is for something you've made that other people can play with."* ·
  *"On topic: things people can run on their computers"* · *"The project should be non-trivial."* ·
  *"The project must be something you've worked on personally and which you're around to discuss."* ·
  *"Please make it easy for users to try your thing out, ideally without barriers such as signups."*
- **Bans that matter:** *"Please don't ask friends to upvote or comment."* ·
  *"Don't solicit upvotes, comments, or submissions."* ·
  *"Please don't use HN primarily for promotion. It's ok to post your own stuff part of the time."* ·
  *"Please don't put generated text in HN posts."* · *"New features and upgrades ('Foo 1.3.1 is out')
  generally aren't substantive enough to be Show HNs."*
- **Author self-submission?** Yes — explicitly. It must be your own work, and you must be present in
  the thread.
- **Payoff:** by far the highest ceiling of anything on this page — a front-page Show HN is thousands
  of visits plus, indirectly, a LibHunt entry (see below). Realistic outcome is much smaller: tens to
  a few hundred visits and useful critique.
- **Verdict: DO IT ON LAUNCH DAY.** The self-hosted demo is exactly the "no signup, just try it" shape
  HN rewards.

### Product Hunt
- **Rules:** https://www.producthunt.com/launch (Launch Guide + FAQ on that page)
- **Mechanism:** *"Log in, click the 'Submit' button in the top right, and then click 'New Product.'
  You'll be prompted first to enter in the product's URL."*
- **Cost:** *"Is Product Hunt free? Yes. It's 100% free to use."*
- **Self-submission explicitly encouraged:** *"Do I need a hunter? No. We encourage makers to hunt
  their own products, and there's no discernible advantage to using a third-party hunter."*
- **Rules that matter:** *"Can I create a company account on Product Hunt? No. Company accounts are
  prohibited."* (fine — solo dev) · *"you cannot ask people directly to upvote your product. Instead,
  ask them to visit and comment."* · *"You can launch as often as you have new significant product
  iterations available."* · timing advice: *"12:01 am Pacific Time is the best time to launch."*
- **Honest fit:** PH rewards polished, consumer-legible products with a landing page, pricing, and a
  "maker story". An MIT, no-account, self-hosted academic tool is a poor shape for it. It is also
  one-shot and noisy.
- **Payoff:** low-moderate and mostly non-technical traffic; a dofollow-ish backlink; occasional
  newsletter pickup.
- **Verdict: OPTIONAL.** Only if you can write a genuinely good launch page. It is not a substitute
  for Show HN.

### AlternativeTo
- **Rules:** [FAQ](https://alternativeto.net/faq/) · [Terms of Use](https://alternativeto.net/about/terms/)
- **Mechanism (verbatim):** *"You can add it yourself :) Just sign up for an account, it's super
  simple. When you're registered, you just have to click the 'Suggest new application' that you can
  find clicking on the User icon in the top right corner."* You then *"fill the fields Platforms,
  License, Descriptions, Tags, etc. and click the button 'Submit the application'."*
  *"You need to verify your email address before you can submit a new app — this is to discourage
  spammers and bots."*
- **Requirements:** *"If you want to suggest your application to be added as an alternative to any
  other one, then just search for that app, click the button 'Contribute to this page' and the option
  'Suggest Alternatives'."* Pricing model must be specified (Free / Freemium / Free for personal use
  / Commercial) and *"You can also specify if the application is Open Source or not and add a link to
  its source code."*
- **Author self-submission?** Yes, explicitly — but note the tension in their own copy: *"Every app
  page, every alternative and almost every recommendation on the site comes from people who actually
  use the software — not from us, and not from the companies that make it."*
  ([about](https://alternativeto.net/about/)) The FAQ's "you can add it yourself" governs the mechanics;
  describe the product plainly rather than in marketing voice.
- **Review reality (verbatim, [Terms](https://alternativeto.net/about/terms/)):** *"Submitted apps go
  into a review backlog, which is usually months long. You can pay a one-time fee to move an app you
  submitted to the front of that queue."* — *"Paying buys a faster review, not approval."*
- **Unverified:** a third-party guide ([SubmitMap](https://submitmap.com/platform/alternativeto/))
  claims the intake form links a "What we don't accept" list that names *"Wrappers around an LLM"*
  among rejected categories. I could not read an official page stating this — **treat as unverified**,
  but it is a reason to frame CiteDuo as a paper explorer, not "an AI tool".
- **Payoff:** a durable, well-indexed listing and backlink; the "alternative to Connected Papers /
  ResearchRabbit / Litmaps" placement is what makes it discoverable. Traffic is modest and slow.
- **Verdict: DO IT — mid priority.** Name at least one real alternative or the listing is near-invisible
  (per the same third-party guide; the official FAQ does say alternatives drive the page's purpose).

### LibHunt — not a submission channel
- **Source:** https://www.libhunt.com/about
- **How it actually works (verbatim):** *"It monitors everything that's posted on Reddit, HackerNews &
  Dev.to (almost in real-time). Then, if an open-source repository gets mentioned, we record that and
  use it to compile the lists of popular and similar projects."*
- **Implication:** there is no form to fill. **You get on LibHunt by being mentioned** — which the Show
  HN post does for you. Treat LibHunt as an outcome of Part 2 action #1, not an action.
- **Payoff:** passive backlink + "alternatives" pages. Zero extra work.

### OpenAlternative
- **Site:** https://openalternative.co/submit
- **Mechanism:** submission requires an account — the page renders a sign-in gate (*"Join the open
  source community and get access to the dashboard"*; magic link / Google / GitHub). So the flow is
  sign in → dashboard → submit.
- **Stated requirements (open-source? free or paid? author self-submission?):** **unverified.**
  `https://openalternative.co/submit` returned HTTP 403 to a plain fetch, the sign-in-gated page
  revealed only the gate, and `https://openalternative.co/learn-more` returned no crawlable content.
  The site positions itself as *"Open Source Alternatives to Proprietary SaaS"*, which implies an
  "alternative to X" framing is expected.
- **Payoff:** unverified; likely a backlink plus small discovery. The natural framing for CiteDuo is
  "alternative to Connected Papers / ResearchRabbit / Litmaps".
- **Verdict: TRY, but verify the rules by hand first.**

### GitHub topics — not a submission, but free distribution
- **Mechanism (verbatim, [GitHub Docs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics)):**
  *"On GitHub, navigate to the main page of the repository. In the top right corner of the page, to
  the right of 'About', click ⚙. Under 'Topics', start to type the topic you want to add… Click Save
  changes."*
- **Rules:** *"Use lowercase letters, numbers, and hyphens."* · *"Use 50 characters or less."* ·
  *"Add no more than 20 topics."* · *"Repository admins can add any topics they'd like to a repository."*
  · *"To browse the most used topics, go to github.com/topics/."*
- **Suggested set:** `citation-network`, `academic-papers`, `literature-review`, `research-tools`,
  `bibliometrics`, `graph-visualization`, `knowledge-graph`, `arxiv`, `rag`, `self-hosted`, `bun`,
  `react`, `sqlite`, `local-first`, `mit-license`.
- **Payoff, honestly:** discoverability and SEO only. Topic pages are *"a list of other repositories
  classified with that topic"* — there is no editorial gate, so there is also no endorsement. Cheap,
  so do it; do not expect traffic on its own. (Also note the awesome-list convention: sindresorhus/awesome
  requires lists to carry `awesome-list` and `awesome` topics —
  [PR template](https://github.com/sindresorhus/awesome/blob/main/pull_request_template.md) — but that
  applies to lists you might create, not to CiteDuo.)

## 1D. Investigated and skipped (with reasons)

| Candidate | Stars | Why it is skipped |
| --- | --- | --- |
| [sindresorhus/awesome](https://github.com/sindresorhus/awesome) | 517k | **It only lists awesome lists, not projects.** The PR template opens *"Congrats on creating an Awesome list!"* and every requirement is about *your list* — *"Has been around for at least 30 days"*, *"Is not AI-generated"*, *"Run awesome-lint"*, *"Must not feature `Contributing` or `Footnotes` sections"*, and a hard *"You have to review at least 4 other open pull requests."* ([contributing.md](https://github.com/sindresorhus/awesome/blob/main/contributing.md), [pull_request_template.md](https://github.com/sindresorhus/awesome/blob/main/pull_request_template.md)). There is no mechanism to add CiteDuo. The only route in is to first build and maintain a separate `awesome-*` list — out of scope. |
| [enaqx/awesome-react](https://github.com/enaqx/awesome-react) | 75k | **Explicitly anti-promotion:** *"Kindly refrain from using this list as an advertisement board or a space to promote your experiments."* ([README](https://github.com/enaqx/awesome-react/blob/HEAD/README.md)). Structurally it has only `### React` and `### React Native` sections of libraries/components/resources — **no applications section.** No CONTRIBUTING.md exists (404). |
| [dzharii/awesome-typescript](https://github.com/dzharii/awesome-typescript) | 5.1k | **The list is archived by its maintainer:** *"I am archiving awesome-typescript and preserving it as a historical reference."* ([README](https://github.com/dzharii/awesome-typescript/blob/HEAD/README.md)). |
| [vitejs/awesome-vite](https://github.com/vitejs/awesome-vite) | 17k | It *does* have a `## Projects Using Vite.js → ### Apps/Websites` section with the right shape (`- [Icônes](https://github.com/antfu/icones) - Icon explorer with instant search.`), **but CiteDuo's stated stack is Bun + React 18 + SQLite with no Vite** — claiming otherwise would be a lie to the maintainers. No contributing file at any of the usual paths (all 404). **Skip unless the build genuinely uses Vite.** |
| [nschloe/awesome-scientific-computing](https://github.com/nschloe/awesome-scientific-computing) | 1.6k | Sections are numerical/scientific *libraries*: Basic linear algebra, Multi-purpose toolkits, Finite Elements, Meshing, Data formats, Sparse linear solvers, Visualization (libraries). CiteDuo is not a scientific-computing library. No contributing section found in the README. |
| [totogo/awesome-knowledge-graph](https://github.com/totogo/awesome-knowledge-graph) | 1.9k | Section `Graph Visualization` lists engines/platforms (AntV G6, Graphistry, Gephi, KeyLines, Linkurious, Cytoscape), not paper tools. And **its contribution rules are placeholder boilerplate**: *"Make sure you take care of this / And this as well / And don't forget to check this"* ([contributing.md](https://github.com/totogo/awesome-knowledge-graph/blob/master/contributing.md)). Rules unverified → padding risk with no upside. |
| [jbmusso/awesome-graph](https://github.com/jbmusso/awesome-graph) | 1.3k | Sections: Graph databases, Triple stores, Graph computing frameworks, Languages, Managed hosting, Learning materials, Conferences. No app section. |
| [Shubhamsaboo/awesome-llm-apps](https://github.com/Shubhamsaboo/awesome-llm-apps) | 141k | It is the author's own hand-built template collection (*"Hand-built, tested end-to-end"*) whose entries point at in-repo paths (`rag_tutorials/...`); external items are tagged `<sub>↗ external</sub>`. **No `CONTRIBUTING.md`, no PR template, no contributing section anywhere** (404 on `CONTRIBUTING.md`, `contributing.md`, `.github/CONTRIBUTING.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `docs/CONTRIBUTING.md`). Submission mechanism: **unverified**. Do not assume you may add yourself. |
| [ZoranPandovski/awesome-open-science](https://github.com/ZoranPandovski/awesome-open-science) | ~4 | Stale: README still says *"this list is still under development 🔧 👷"*. |
| [emptymalei/awesome-research](https://github.com/emptymalei/awesome-research) | 2.8k | **Deprecated by the author:** *"This repo is deprecated. Instead, I maintain all the contents using the following website."* |
| [BasileChretien/awesome-PhD](https://github.com/BasileChretien/awesome-PhD) | 0 | Real list with a `### Literature` section that already lists Connected Papers/Litmaps, but 0 ★ = no audience, and the PR route goes through an external `contributing_guidelines.md`. Not worth the goodwill. |
| `awesome-research-tools` (as named in the brief) | — | **No such canonical repo found.** The real namesakes are [mancano-tales/awesome-open-source-research-tools](https://github.com/mancano-tales/awesome-open-source-research-tools) (0 ★, see 1B), [0x11c11e/awesome-ai-research-tools](https://github.com/0x11c11e/awesome-ai-research-tools) and [husthuke/awesome-knowledge-graph](https://github.com/husthuke/awesome-knowledge-graph). |
| `awesome-academic` | — | No canonical repo found; the closest real lists are the research-tools and scholarly-data lists above. |
| `awesome-scholarly-html` | — | **Does not appear to exist as an awesome list.** `https://github.com/openscilab/awesome-scholarly-html` and `https://github.com/scholarly-html/awesome-scholarly-html` both return 404, and search surfaced no such list. (`scholarly-html` is a document-format project, not an awesome list.) |
| `awesome-graph-visualization` | — | **No canonical repo found:** `https://github.com/jacomyal/awesome-graph-visualization` returns 404. The real, maintained equivalents are graphgeeks-lab/awesome-graph-universe and briatte/awesome-network-analysis. |
| `awesome-opensource` | — | No canonical repo (`awesome-opensource/awesome-opensource` and `sindresorhus/awesome-opensource` both 404). `https://awesomeopensource.com/` returned **HTTP 403 (Cloudflare)** — **unverified**; it appears to be an automated index of GitHub projects rather than a list you submit to. |
| `awesome-vite` / `awesome-bun` style "stack" lists generally | — | Only worth entering if the stack claim is literally true. CiteDuo's true stack claim is **Bun** (see the entry below), not Vite. |

---

# PART 2 — Ranked action list

Ordered by *expected value ÷ risk*, with the hard gates respected. The Show HN post is first because
it is the only channel here with a real traffic ceiling **and** it is what feeds LibHunt.

> **Do not submit any ready-made entry text to awesome-selfhosted.** See finding #1. The entry below
> is deliberately described as fields, not supplied as copy.

### #1 — Show HN (launch day)
- **What:** submit `https://github.com/benbenlijie/citeduo` (repo public, README with the demo GIF at
  the top, demo URL reachable, no signup).
- **Exact title:** `Show HN: CiteDuo – See how two papers are actually connected`
  (must begin with `Show HN`; per
  [newsguidelines](https://news.ycombinator.com/newsguidelines.html) do not editorialise or add a
  gratuitous number; per [showhn.html](https://news.ycombinator.com/showhn.html) the project must be
  non-trivial and yours, and must be something people can try).
- **Body:** **write it yourself** — HN bans generated text. Suggested content, in your own words: what
  the two-paper question is, one concrete example path with its edge types, what the demo does and
  does not do, the stack (Bun + React + SQLite, one process), license, and what feedback you want.
- **Effort:** low. **Payoff:** highest.
- **Rejection trigger:** posting it as a landing page / asking anyone to upvote · reposting after it
  does not take off (*"Please don't delete and repost"*) · not being around to answer questions.

### #2 — graphgeeks-lab/awesome-graph-universe (within the first week)
- **PR title:** `Add CiteDuo`
- **Commit message:** `Add CiteDuo to Graph Visualization > Apps`
- **Exact line** — `README.md`, `## Graph Visualization` → `### Apps`, at the **top** of that subsection
  (entries there are alphabetical and `CiteDuo` sorts before `FalkorDB Browser`):
  ```markdown
  - [CiteDuo](https://github.com/benbenlijie/citeduo) ![Purpose](https://img.shields.io/badge/purpose-networkAnalysis-orange) ![Techno](https://img.shields.io/badge/techno-Bun-green) Self-hosted academic paper explorer that renders PageRank-weighted citation networks with Louvain communities and explains, hop by hop, how two papers are connected.
  ```
- **PR description:** one short paragraph + the repo link (CONTRIBUTING asks for *"a detailed
  description in your PR"*).
- **Rejection trigger:** none stated, so the realistic ones are a malformed badge line (copy the
  surrounding style exactly) or a PR that looks like a drive-by advert with no explanation.

### #3 — briatte/awesome-network-analysis (week 1–2)
- **PR title:** `Add CiteDuo`
- **Commit message:** `Add CiteDuo`
- **Exact line** — `README.md`, `## Software`, alphabetical position: after `Circos`, before
  `Cytoscape`; three spaces after the dash, Title Case, U.S. English, no monospace, no quotes, no
  trademark symbols:
  ```markdown
  -   [CiteDuo](https://github.com/benbenlijie/citeduo) - Cross-platform, self-hosted web application to build and explore citation networks and to explain, edge by edge, how two papers are connected, written in TypeScript with Bun, React and SQLite.
  ```
- **Also required:** add your own name to the **copyright waiver** at the end of the README — *"If you
  contribute to this list, please add your name to the copyright waiver at the end of the list"*
  ([CONTRIBUTING.md](https://github.com/briatte/awesome-network-analysis/blob/master/CONTRIBUTING.md)).
  Do this in the same PR.
- **PR description:** lead with the network-analysis substance (PageRank weighting, Louvain
  community detection, edge-type-ranked paths) and say plainly that you are the author.
- **Rejection trigger:** *"Only awesome is awesome"* — a maintainer can fairly read CiteDuo as a
  domain app rather than a network-analysis tool. Also check the wiki of
  [rejected content](https://github.com/briatte/awesome-network-analysis/wiki/rejected-content) before
  submitting; missing the copyright-waiver step is an easy avoidable miss.

### #4 — AlternativeTo (week 1–2, form, no PR)
- **Where:** sign up (verified email is mandatory), then *"Suggest new application"* → `/manage-item`.
  ([FAQ](https://alternativeto.net/faq/))
- **Fields:** Name `CiteDuo` · official URL `https://github.com/benbenlijie/citeduo` · Demo
  `https://watchdeep.net/paper-demo/` · Pricing: **Free** + **Open Source** + source link · Platforms:
  **Online** (web app) · Tags from their vocabulary (research, knowledge management, …) · square icon
  ≥128×128 · screenshots · **and name real alternatives** (Connected Papers, ResearchRabbit, Litmaps)
  — the FAQ is explicit that you do this via *"Contribute to this page" → "Suggest Alternatives"*.
- **Copy:** write the descriptions in your own plain words; their own about page stresses that
  recommendations come from users, *"not … the companies that make it"*.
- **Rejection trigger:** the months-long backlog (*"usually months long"*) if you are not willing to
  pay for priority — **payment buys speed, not approval**; a listing with no alternatives is
  *"almost invisible"* (third-party sourcing — see 1C); and per a third-party guide, an "LLM wrapper"
  framing is on their decline list (unverified). Describe the product, not the assistant.
- **Payoff:** durable listing + backlink; slow but real.

### #5 — selfh.st (week 2–3)
- **Where:** https://selfh.st/submit/ (open in a browser; the form is script-loaded — **fields unverified**).
- **What to say:** one-paragraph description, repo URL, demo URL, license (MIT), platform (Bun/SQLite,
  single process, no account), and a screenshot. Match the register of the app directory.
- **Rejection trigger:** unverified criteria — so no promises. Do not pitch it as anything other than
  a self-hosted app.

### #6 — awesome-bun (week 3–4)
- **PR title:** `Add CiteDuo`
- **Commit message** (CONTRIBUTING: *"The body of your commit message should contain a link to the
  repository"*):
  ```
  Add CiteDuo

  https://github.com/benbenlijie/citeduo
  ```
- **Exact line** — `README.md`, `## Tools` (append at the end; that section is not alphabetical):
  ```markdown
  - [CiteDuo](https://github.com/benbenlijie/citeduo) - Self-hosted academic paper explorer with citation-network analysis and an in-app arXiv reader, served as a single Bun process.
  ```
  Format per [CONTRIBUTING.md](https://github.com/oven-sh/awesome-bun/blob/HEAD/CONTRIBUTING.md):
  *"Use the following format: `[Title Case Name](link) - Description.`"*, description starts with a
  capital and ends with a period, *"Make an individual pull request for each suggestion."*
- **Rejection trigger:** `## Tools` is Bun *tooling* (version managers, Playground, VS Code extension,
  doc generators, Discord bots). A full web application may be judged out of scope. Say in the PR
  *why* it belongs — a real, non-trivial, single-process Bun application is good evidence the runtime
  works beyond toys — and accept a no gracefully.

### #7 — GitHub topics (day one, 10 minutes)
- Add the topic set from 1C via the About panel. Lowercase, hyphens, ≤50 chars, ≤20 topics.
- **Payoff:** SEO/discoverability only. **Rejection trigger:** none (self-service), but irrelevant or
  spammy topics dilute the useful ones.

### #8 — steven2358/awesome-generative-ai → `DISCOVERIES.md` (only if you want the backlink)
- **Entry format** (per [CONTRIBUTING.md](https://github.com/steven2358/awesome-generative-ai/blob/main/CONTRIBUTING.md):
  `[ProjectName](Link) - Description.` + `#opensource`):
  ```markdown
  [CiteDuo](https://github.com/benbenlijie/citeduo) - Self-hosted academic paper explorer whose reading assistant retrieves over the paper's full text before answering. #opensource
  ```
- **Rejection trigger:** the main list hard-requires ≥1,000 stars, so at launch only DISCOVERIES.md is
  reachable; and the maintainer may reasonably say CiteDuo is not a generative-AI project at all.
  Low stakes either way.

### Deferred — do NOT do these yet

| Action | Gate |
| --- | --- |
| **awesome-selfhosted** (`software/citeduo.yml`, PR to [awesome-selfhosted-data](https://github.com/awesome-selfhosted/awesome-selfhosted-data)) | Hard: *"first released more than 4 months ago"* → **calendar date ≥ 4 months after the v0.1.0 release.** And the YAML must be written by a human; resolve the `platforms` field (no `Bun` exists — `Nodejs` is the nearest) and pick a defensible tag (`Knowledge Management Tools`, possibly + `Generative Artificial Intelligence (GenAI)`), declaring `depends_3rdparty: true` since it calls Semantic Scholar/OpenAlex/LLM APIs. |
| **Product Hunt** | Only if you can build a proper launch page; one-shot, non-technical audience. |
| **OpenAlternative** | Verify its rules by hand first (requirements unverified). |
| **awesome-scholarly-data-analysis** | Late; rules unverified; likely stale. |
| **awesome-open-source-research-tools** | Only if you want the ground-floor slot in a 0 ★ list. |

---

# PART 3 — Don'ts for this channel

**Don't mass-open PRs across many lists in one day.**
A solo maintainer opening eight PRs in an afternoon looks like a script, and maintainers of awesome
lists talk to each other and watch the same repositories. The concrete cost is not just rejections:
[awesome-selfhosted](https://github.com/awesome-selfhosted/awesome-selfhosted-data/blob/master/CONTRIBUTING.md)
states *"Machine/LLM-generated contributions are not allowed and will result in a ban"*, and
[sindresorhus/awesome](https://github.com/sindresorhus/awesome/blob/main/pull_request_template.md)
demands *"Don't waste my time."* A burst is the fastest way to get a project permanently labelled
spam. Also note that a surge of same-day PRs is trivially visible in your GitHub public activity —
which is a permanent, searchable record.

**Don't ignore a list's entry criteria.**
The rules exist to be read, and most of them are mechanical. Submitting to awesome-selfhosted before
the 4-month mark gets an instant close; submitting a <1,000 ★ project to awesome-generative-ai's main
list gets routed to DISCOVERIES; ignoring alphabetical ordering or the `#opensource` tag gets a
"please fix" round-trip at best. Each ignored rule spends the limited patience of a volunteer.

**Don't add yourself to a list that forbids or discourages author submissions.**
[awesome-react](https://github.com/enaqx/awesome-react/blob/HEAD/README.md) says *"Kindly refrain from
using this list as an advertisement board or a space to promote your experiments."* Posting there
anyway is not a gray area — it is the specific behaviour the maintainer asked people to stop. Same for
lists with no contribution mechanism at all (e.g. awesome-llm-apps, where no contributing file exists):
opening a PR into an undocumented process makes you the person who guessed.

**Don't bump your own PR.**
Commenting "any update?" every second day converts a neutral review queue into an irritation, and it
is the top reason a maintainer closes instead of merging. The published expectation on
awesome-selfhosted is already generous — *"your Pull Request will be merged at least ~1 week after
approval, depending on maintainers time"* — and awesome-generative-ai says outright that review is
FIFO *"by hand"*. Wait. If it has been weeks and the PR is stale, one polite comment with new
information (e.g. "v0.1.1 is out and the install path is now one command") is fine; a second is not.

**Don't argue with a maintainer who declines.**
"I already have a demo and it's MIT" is not a rebuttal to "this list is about network-analysis
libraries". The Awesome Manifesto as quoted by
[awesome-network-analysis](https://github.com/briatte/awesome-network-analysis/blob/master/CONTRIBUTING.md)
is *"Only awesome is awesome… rather leave stuff out than include too much"* — curation is the product,
and a decline is the list working as designed. Thank them, ask (once) what would change their mind,
and leave. Arguing costs you the possibility of a future PR when the project has grown into the list's
criteria.

**Don't add CiteDuo to lists it does not belong in.**
Concretely: awesome-React (no apps section, anti-promo), awesome-Vite (the project does not use Vite),
awesome-scientific-computing (numerical libraries), awesome-digital-humanities (humanities-specific),
and the AI-tool lists that will take anything (mahseema/awesome-ai-tools accepts self-promotion by
design — that is a signal about its value, not an invitation). Padding is visible: a maintainer who
sees a paper explorer sandwiched between a voice cloner and a logo generator concludes the submitter
did not read the list, and that conclusion transfers to the project itself.

**Don't have a machine write the entry or the post.**
(Named separately because it is the one item here with an explicit ban attached.) awesome-selfhosted's
guide tells agents not to write entries, PR bodies, or the human attestation, and not to comment on
PRs; HN bans generated post text and automated posting. Practical consequence: the moment a
maintainer asks "did you write this?", the honest answer has to be yes.

**Don't submit before the repo is public.**
`https://github.com/benbenlijie/citeduo` currently returns 404. Every PR and every form above assumes
a public repo, a working demo link, and install instructions that a stranger can follow — those are
explicit criteria on awesome-selfhosted (*"has working installation instructions"*) and implicit
everywhere else.

---

# PART 4 — Timing, spacing, and "is this yours?"

**How long after the main launch?** Start **1–2 weeks after launch day**, not on it.

- Launch day is for Show HN, GitHub topics, and answering the thread. That day is spent on the launch,
  not on paperwork.
- Two weeks gives you: a stable demo under real traffic, a first batch of real stars, at least one
  point release with the bugs HN found, and — most usefully — a README whose install steps you know
  work because strangers followed them.
- The exception is any list with a hard age gate: awesome-selfhosted's *"first released more than 4
  months ago"* is measured from the v0.1.0 release date, so diary it now and do not waste a PR earlier.

**How to space the PRs.**

- **Maximum two per week; one at a time is better.** Order them so the ones with the smallest
  audience and the strictest fit go *later*, not earlier — if a maintainer says no, you want that to
  be an obscure list, not the 325k one.
- **One item per PR, always.** awesome-selfhosted (*"Submit one item per pull request"*) and
  awesome-digital-humanities (*"restricted to addition of one new entry per pull-request"*) state it;
  it is good manners everywhere.
- **Never send the same text to two lists.** Each has its own conventions (badges, alphabetical
  insertion, commit-message bodies, DISCOVERIES vs main list). Copy-paste is how entries end up
  malformed and PRs get closed.
- **Batch by *type*, not by *day*:** all PR-shaped work in one sitting (prepared per-list, sent
  spread out), all form-shaped work (AlternativeTo, selfh.st, OpenAlternative) whenever you have
  the assets ready.
- **Come back at your next release.** steven2358/awesome-generative-ai's main list opens up at
  **1,000 stars**; awesome-selfhosted opens at **4 months**. Neither is a rejection — both are dates.

**How to handle "is this yours?"**

Answer immediately, plainly and without hedging:

> Yes — I'm the author. I built CiteDuo and I maintain it; happy to answer anything about it.

Why that is fine, and why it is the only sensible answer:

1. **Many of these lists expect it.** AlternativeTo's FAQ says *"You can add it yourself :)"*; Product
   Hunt says *"We encourage makers to hunt their own products"*; Show HN requires that *"The project
   must be something you've worked on personally"*. Author submission is normal, not a confession.
2. **It is already obvious.** The repo's contributor list, the PR coming from the owner account, the
   commit history, the "solo developer" README — a maintainer knows before asking. The question is a
   disclosure test, not a factual one.
3. **The lie is the expensive part.** Maintainers who catch an undeclared self-submission generalise
   to the project: if the entry cannot be trusted to be honest, the software might not be either. This
   is a permanent, public cost to fix, and it is entirely avoidable.
4. **Honesty unlocks the useful conversation.** Declared, a maintainer can tell you *"right now this
   reads as off-topic; here is the angle that would fit"* or *"come back when you have a release"* —
   which is worth more than the listing.
5. **Pair it with the disclosure they actually need.** Say what CiteDuo is *and* what it is not: it is
   not a generative-AI product, it does not compete with the list's existing entries in the way a
   first glance might suggest, and where the fit is arguable (awesome-network-analysis's software
   section), say which capability you think justifies it.

**And keep the one line that makes all of this work:** this document is preparation. The entry text,
the PR description and the Show HN post should be written and submitted by you, by hand — which is
also, on several of these lists, a written rule.

---

## Appendix — verification log

Every claim above traces to one of these pages, read on **2026-10-10**.

| URL | What it established |
| --- | --- |
| https://github.com/awesome-selfhosted/awesome-selfhosted-data/blob/master/CONTRIBUTING.md | YAML-per-project mechanism; the AI-agent prohibition; *"Machine/LLM-generated contributions are not allowed and will result in a ban"*; description-style rules; "What does not qualify" |
| https://github.com/awesome-selfhosted/awesome-selfhosted-data/blob/master/.github/PULL_REQUEST_TEMPLATE.md | *"first released more than 4 months ago"*; human attestation; *"Submit one item per pull request"*; demo-link rule; ~1-week merge note |
| https://github.com/awesome-selfhosted/awesome-selfhosted-data/blob/master/.github/ISSUE_TEMPLATE/addition.md | Required YAML fields and the <250-char sentence-case description rule |
| https://github.com/awesome-selfhosted/awesome-selfhosted-data/blob/master/software/paperless-ngx.yml | Rendered entry shape (example only) |
| https://github.com/awesome-selfhosted/awesome-selfhosted-data/blob/master/tags/knowledge-management-tools.yml · `.../tags/generative-ai.yml` | The two candidate tags and their descriptions |
| https://github.com/awesome-selfhosted/awesome-selfhosted-data/tree/master/platforms | No `Bun` platform; `nodejs.yml`, `deno.yml`, `javascript.yml` exist |
| https://github.com/awesome-selfhosted/awesome-selfhosted-data/blob/master/licenses.yml | `identifier: MIT` is accepted |
| https://github.com/awesome-selfhosted/awesome-selfhosted/blob/master/README.md | FOSS-only list; tag sections; `Document Management`/`Knowledge Management` categories |
| https://github.com/sindresorhus/awesome/blob/main/contributing.md · `.../pull_request_template.md` | Lists-only scope; 30-day/awesome-lint/no-AI/4-PR-review requirements; *"Fully AI-generated pull requests are not accepted"* |
| https://github.com/enaqx/awesome-react/blob/HEAD/README.md | *"Kindly refrain from using this list as an advertisement board"*; only React / React Native sections |
| https://github.com/dzharii/awesome-typescript/blob/HEAD/README.md | *"I am archiving awesome-typescript"* |
| https://github.com/vitejs/awesome-vite/blob/HEAD/README.md | `Projects Using Vite.js → Open Source / Apps/Websites`; no contributing file (404s) |
| https://github.com/oven-sh/awesome-bun/blob/HEAD/CONTRIBUTING.md · `.../README.md` | `[Title Case Name](link) - Description.`; one PR per suggestion; commit body carries the repo link; `## Tools` contents |
| https://github.com/briatte/awesome-network-analysis/blob/master/CONTRIBUTING.md · `.../README.md` | Alphabetical/Title Case/US English rules; copyright waiver; manifesto quote; `## Software` entry style |
| https://github.com/graphgeeks-lab/awesome-graph-universe/blob/main/README.md · `.../CONTRIBUTING.md` | `Graph Visualization → Apps` section and badge style; PR/commit expectations |
| https://github.com/nschloe/awesome-scientific-computing/blob/HEAD/README.md | Numerical-library section list (no fit) |
| https://github.com/totogo/awesome-knowledge-graph/blob/master/contributing.md · `.../readme.md` | Placeholder boilerplate guidelines; `Graph Visualization` contents |
| https://github.com/jbmusso/awesome-graph/blob/master/README.md | No app section |
| https://github.com/Shubhamsaboo/awesome-llm-apps/blob/HEAD/README.md | In-repo template collection; `<sub>↗ external</sub>` marker; no contributing file at 5 probed paths (404) |
| https://github.com/steven2358/awesome-generative-ai/blob/main/CONTRIBUTING.md | `[ProjectName](Link) - Description.` + `#opensource`; ≥1,000-star main-list criterion; DISCOVERIES fallback; hand review |
| https://github.com/mahseema/awesome-ai-tools/blob/main/README.md | *"Eager to contribute or feature your product? Send a PR"*; affiliate-heavy Editor's Choice |
| https://github.com/mancano-tales/awesome-open-source-research-tools/blob/main/CONTRIBUTING.md · `.../README.md` | `data/tools.json` SSOT workflow and the 5-point inclusion checklist |
| https://github.com/napsternxg/awesome-scholarly-data-analysis/blob/master/README.md | `## Visualizations` format; no CONTRIBUTING.md (rules unverified) |
| https://github.com/dh-tech/awesome-digital-humanities/blob/main/CONTRIBUTING.md · `.../README.md` | *"one new entry per pull-request"*, alphabetical, short pitch; `## Visualization` format |
| https://news.ycombinator.com/showhn.html | Show HN eligibility; *"Please don't ask friends to upvote"*; title must begin with "Show HN" |
| https://news.ycombinator.com/newsguidelines.html | *"It's ok to post your own stuff part of the time"*; *"Don't solicit upvotes, comments, or submissions"*; *"Please don't put generated text in HN posts"* |
| https://www.producthunt.com/launch | Free; *"We encourage makers to hunt their own products"*; no company accounts; no asking for upvotes; relaunch policy; submit flow |
| https://alternativeto.net/faq/ | *"You can add it yourself :)"*; "Suggest new application"; verified email; pricing/Open Source fields |
| https://alternativeto.net/about/terms/ | Months-long backlog; paid priority review buys speed, not approval; listings are community-submitted |
| https://alternativeto.net/about/ | *"not from us, and not from the companies that make it"* |
| https://www.libhunt.com/about | *"It monitors everything that's posted on Reddit, HackerNews & Dev.to… if an open-source repository gets mentioned, we record that"* |
| https://openalternative.co/submit | Sign-in-gated submission (requirements **unverified**) |
| https://selfh.st/about/ · https://selfh.st/submit/ | App directory + "Submit Content" page exist; form fields **unverified** |
| https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics | Topics mechanism, casing/limits, `github.com/topics/`, contributions to featured topics via `github/explore` |
| https://submitmap.com/platform/alternativeto/ (third-party) | Claimed decline list incl. "wrappers around an LLM" — **unverified, not official** |
| Star counts via `https://img.shields.io/github/stars/<owner>/<repo>.json` | All ★ figures in this document |

**Explicitly unverified in this document:** selfh.st's submission fields and criteria; OpenAlternative's
listing requirements, cost and self-submission policy; AlternativeTo's official "what we don't accept"
list; awesome-scholarly-data-analysis's contribution rules and maintenance status; awesome-llm-apps'
submission mechanism; totogo/awesome-knowledge-graph's contribution rules (placeholder text);
awesomeopensource.com (HTTP 403).
