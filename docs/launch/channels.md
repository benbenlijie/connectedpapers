# CiteDuo — Launch Playbook: Channel Rules & Ready-to-Paste Copy

Research date: **2026-10-10**. Every rule claim below carries the URL it came from. Where a rule could not be confirmed from an authoritative source, it is marked **UNVERIFIED** — treat those as "go read the sidebar yourself before posting", not as fact.

## The project (fixed facts — do not embellish, do not invent numbers)

| | |
| --- | --- |
| Name | **CiteDuo** |
| Repo | https://github.com/benbenlijie/citeduo |
| One-liner | A self-hosted, local-first academic paper explorer that answers "how are these two papers actually connected?" with an explained, evidence-ranked path hop by hop — plus an interactive citation-network graph, in-app arXiv reading with bilingual translation, and a retrieval-grounded AI reading assistant that must call search/section tools before it answers. |
| Stack | Bun + React 18 + SQLite, one process, MIT license, no account, no cloud |
| Demo | https://watchdeep.net/paper-demo/ — a **snapshot** instance; the AI assistant and LLM translation are **disabled** there |
| Version | first public release, v0.1.0 |
| Author | solo developer, Chinese speaker; GitHub account since 2011, 71 public repos |

> **Naming rule:** the project is **CiteDuo**. A repo rename is in progress; the old name must never appear in any post, title, hashtag, screenshot, or URL. Check screenshots and the demo page title for stale strings before posting.

---

## ⚠️ Read this before you use any copy below

Two of the biggest channels have an explicit, current rule against text that reads as machine-generated. This document was assembled by an AI, so **the drafts in Part 2 are scaffolding, not paste-ready prose**. You must rewrite them in your own voice before posting. That is not politeness, it is the rule:

- Hacker News: *"Write your text by hand. Don't use an LLM to generate any of it (not even a tiny bit, including to edit or spruce it up). Reason: the community is super fussy about this right now, and LLM language leaves imprints on your text which are generating quite some backlash when it appears on HN itself. This is a big dividing line at present!"* — https://news.ycombinator.com/item?id=22336638 (moderator `dang`, edit dated 2026-03-28)
- Hacker News guidelines: *"Please don't post generated text or AI-edited text. HN is for conversation between humans."* — https://news.ycombinator.com/newsguidelines.html
- V2EX: *"请不要把 AI 生成的内容发送到这里"* — https://www.v2ex.com/about
- r/opensource: *"All AI-generated content is low-effort and ban worthy."* — https://old.reddit.com/r/opensource/about/rules/

Practical consequence: use the drafts to get the **structure, length, and claim list** right, then write the actual sentences yourself on the day, from the facts in the table above.

---

# PART 1 — Rules, per channel

## 1. Hacker News — Show HN

Primary sources fetched: https://news.ycombinator.com/showhn.html · https://news.ycombinator.com/item?id=22336638 (moderator tips) · https://news.ycombinator.com/newsguidelines.html · https://news.ycombinator.com/newsfaq.html · https://news.ycombinator.com/yli.html · https://news.ycombinator.com/showlim

| Question | Rule | Source |
| --- | --- | --- |
| What is allowed | Something *you made* that people "can play with". On-topic: "things people can run on their computers or hold in your hands". Must be non-trivial, and you must be around to discuss it. | https://news.ycombinator.com/showhn.html |
| What is off-topic | Blog posts, sign-up pages, newsletters, lists, landing pages, fundraisers. "If your work isn't ready for users to try out, please don't do a Show HN." | https://news.ycombinator.com/showhn.html |
| Required format | Title must begin with `Show HN`. Keep it factual, no superlatives, no gratuitous numbers, don't editorialize, and **drop the site name if the title contains it**. | https://news.ycombinator.com/showhn.html · https://news.ycombinator.com/newsguidelines.html |
| Barriers | "Please make it easy for users to try your thing out, ideally without barriers such as signups or emails." | https://news.ycombinator.com/showhn.html |
| Body text | Include backstory (how you came to work on it), a clear statement of what it does, and what's *different* about it. Drop all marketing/sales language — "on HN, that is an instant turnoff." | https://news.ycombinator.com/item?id=22336638 |
| Username | "Don't have your username be that of your company or project." | https://news.ycombinator.com/item?id=22336638 |
| Releasing | A new release only qualifies as a Show HN if it is *significantly* different; incremental "1.3.1 is out" posts are not. Should happen only once or twice a year. | https://news.ycombinator.com/showhn.html |
| Self-promo ceiling | "Please don't use HN primarily for promotion. It's ok to post your own stuff part of the time, but the primary use of the site should be for curiosity." | https://news.ycombinator.com/newsguidelines.html |
| Penalty for over-promotion | Software classifies accounts that submit primarily their own stuff as "promotional" and starts filtering their posts. | moderator `dang`, https://news.ycombinator.com/item?id=38779156 |

### (a) Is there currently a new-account restriction on submitting Show HN?

**Yes — there is an active restriction, and it is aimed at newcomers.**

- The official page at https://news.ycombinator.com/showlim states: *"We're temporarily restricting Show HNs because of a massive influx, mostly by users who aren't yet familiar with the site or its culture. You're welcome on HN! Take some time to get to know the community, become a good contributor, and then it will be fine to post an occasional Show HN."*
- When asked to restrict new accounts, `dang` replied: *"We're going to at least restrict Show HNs for a while."* — https://news.ycombinator.com/item?id=47300772 and https://news.ycombinator.com/item?id=47300329
- On the threshold: *"There's no blanket ban on new users posting, and even when there's a bar, it's a low one."* — same thread.
- The unlock criteria are deliberately undocumented: *"https://news.ycombinator.com/showlim contains such information. It's vague, I know, but that's because we want people to be genuine community members, which is not a checklist process."* — https://news.ycombinator.com/item?id=47300329
- Users report hitting a literal "do not have the clearance" message when attempting a Show HN from a fresh account. — same thread.

**What this means for CiteDuo:** a GitHub account from 2011 with 71 public repos earns you nothing on HN. HN gates on your **HN** account's age and participation history. If the author's HN account is new or has only ever posted their own projects, a Show HN may be blocked or filtered. Fix: participate on HN as a reader and commenter for a while before launching. Do **not** create a fresh account for launch day.

### (b) Exact stance on soliciting votes / booster comments

Unambiguous, and it is the single easiest way to get the launch buried:

- *"Can I ask people to upvote my submission? **No.** Users should vote for a story because they personally find it intellectually interesting, not because someone has content to promote. We penalize or ban submissions, accounts, and sites that break this rule, so please don't."* — https://news.ycombinator.com/newsfaq.html
- *"Can I ask people to comment on my submission? **No**, for the same reason."* — https://news.ycombinator.com/newsfaq.html
- Guidelines: *"Don't solicit upvotes, comments, or submissions."* — https://news.ycombinator.com/newsguidelines.html
- *"Make sure your friends don't post booster comments. That's not allowed on HN. Our readers have a nose for this, and will sniff them out and flame you. That will damage your reputation—and ours—and we may have to bury your thread. **Please re-read the previous paragraph. It is the worst mistake you can make on HN!**"* — https://news.ycombinator.com/yli.html
- Show HN page repeats it: *"Please don't ask friends to upvote or comment. That's not ok on HN."* — https://news.ycombinator.com/showhn.html
- Do not post a "we're live on HN, please upvote" link anywhere — not X, not WeChat, not Discord. The FAQ language explicitly covers asking on other platforms.

### (c) Is coordinating the launch with press coverage advised against?

**Yes. Explicitly, in writing.** This is the clearest answer of the three:

> *"Don't coordinate your HN launch with other events, e.g. press articles. It does no good and is a pain. All you need for HN is enough free time to engage with commenters on that day. If you've granted a press exclusive, wait till you're free and do HN then."*
> — https://news.ycombinator.com/yli.html

`dang` confirms he gives this advice to YC founders: *"I always tell YC startups not to do this when they're launching on HN. Well, except when I forget, and then it usually goes bad."* — https://news.ycombinator.com/item?id=40741609

Also from the same page, the tone rules that matter most for your body text: *"Don't use superlatives (fastest, biggest, first, best). Modest language is stronger."* and *"End with a warm, open-ended invitation to the community to share their ideas, experiences, and feedback."* — https://news.ycombinator.com/yli.html

---

## 2. Reddit

### 2.1 Sitewide rules (apply everywhere)

| Rule | Detail | Source |
| --- | --- | --- |
| 10% / 9:1 guideline | "only 1 out of every 10 of your submissions should be your own content"; ideally counted across posts *and* comments. | https://support.reddithelp.com/hc/en-us/articles/205926439-Reddit-Rules |
| Promotional content isn't automatically spam | "On Reddit, promotional content is not inherently considered to be spam. That said, some communities do have strict policies that disallow any kind of promotional content." | https://support.reddithelp.com/hc/en-us/articles/28012014962580-How-do-I-keep-spam-out-of-my-community |
| Definition of spam | "repeated or unsolicited actions (whether automated or manual) that negatively affect redditors, communities, and/or Reddit itself" | https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam |
| Disclosure | "You should not hide your affiliation to your project or site, or lie about who you are or why you like something." | https://old.reddit.com/wiki/selfpromotion |
| Vote manipulation | "Vote cheating or manipulation, whether manual, programmatic, or otherwise" — including "coordinated voting with an organized group of people (or bots)". | https://support.reddithelp.com/hc/en-us/articles/360043066412-Disrupting-Communities |
| Cross-posting the same text | "Mass-posting repetitive content for the purpose of exposure" is spam. | https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam |
| Mods decide | "community moderators adjudicate what constitutes unwanted/spammy content in their communities and may take action accordingly." | https://support.reddithelp.com/hc/en-us/articles/28012014962580-How-do-I-keep-spam-out-of-my-community |

Note: the old wiki at https://old.reddit.com/wiki/selfpromotion is flagged *"This page is no longer updated."* The current, authoritative statements are the Reddit Help articles above. Also note the guideline de-emphasises a rigid ratio: *"If someone exceeds the 10% that doesn't automatically make them a spammer! Remember to consider intent and effort."* — https://www.reddit.com/r/modnews/comments/2oamgp/moderators_clarifications_around_our_101/

### 2.2 Per-subreddit

#### r/MachineLearning — ✅ post, but prefer the dedicated thread

| Item | Finding | Source |
| --- | --- | --- |
| Self-promotion | Rule 2 "No Self-Promotion": does not permit promotion of **paid** products where intent is clearly to promote; posts linking paid products are OK *if* they offer "sufficient value" and intent is "to share a resource or collect feedback". "The decision will be made entirely at the discretion of the moderator team." | https://old.reddit.com/r/MachineLearning/about/rules/ |
| Marketing/SEO | Rule 3: "strictly prohibits strategic marketing campaigns... and posts intended to rank for SEO purposes." Penalty is a **perpetual ban with all past posts and comments purged**. | https://old.reddit.com/r/MachineLearning/about/rules/ |
| No spam | Rule 1: repeat offenders "permanently banned". | https://old.reddit.com/r/MachineLearning/about/rules/ |
| Low-effort | Rule 6: low-effort posts removed. | https://old.reddit.com/r/MachineLearning/about/rules/ |
| Required tags | Posts require a tag; current flair set is **Research / Discussion / Project / News**, used in titles as `[R]` `[D]` `[P]` `[N]`. "Posts without appropriate tag will be removed." | Announcement: https://www.reddit.com/r/MachineLearning/comments/56hdqi/no_shirt_no_tags_no_service_posts_without/ · live usage confirms `[P]`/`[D]`/`[R]`/`[N]`: https://old.reddit.com/r/machinelearning/ |
| Day-of-week | Historically link posts were restricted on weekdays and permitted on weekends (self-post requirement), but this is a **2018/2020-era rule and I could not confirm it is still enforced** — **UNVERIFIED**. | https://www.reddit.com/r/MachineLearning/comments/g72bzc/ |
| Dedicated promo thread | There is a recurring **[D] Self-Promotion Thread**: "Please post your personal projects, startups, product placements, collaboration needs, blogs etc." It exists "to encourage those in the community to promote their work by not spamming the main threads." | https://www.reddit.com/r/MachineLearning/comments/1q1nko4/d_selfpromotion_thread/ (posted 2026-02-10) |
| Account gate | None stated in the rules. **UNVERIFIED** whether AutoMod applies a karma/age gate. | — |

**Recommendation:** post to the **`[D] Self-Promotion Thread`** first — it is purpose-built and rules-compliant. Only consider a standalone `[P]` post if you frame it as a genuine technical write-up (e.g. "how I rank evidence for multi-hop citation paths"), not as an announcement. Rule 3's "SEO/marketing campaign" clause is the thing that gets accounts permanently purged, and a bare "I made a thing, here's the link" post is the shape that trips it.

#### r/PhD — ✅ explicitly allowed, best-fit sub for this project

Rule 3 bans "spam, self-promotion, unsolicited surveys, or research recruitment" and says violations "will result in a ban". **But** the mod team added a carve-out specifically for open-source tools:

> **"Tool Sharing Policy** — If you have an opensource github repo of a tool you built and want to share, you are welcome to share that. If you want to recommend a trusted indie software, you may do that. If you want to talk about an industry standard corporate tool, that is cool. **Intransparent startup tools are not allowed.** Neither is product validation, validation interviews, etc. Violations result in permaban."
> — https://old.reddit.com/r/PhD/about/rules/

The mod rationale (helpful for tone): the team decided to allow "open-source tools (Zotero, personal projects with GitHub repos...)" and the litmus test is that *"your personal project is only welcome here if it does not have a 'free trial' button"* — https://www.reddit.com/r/PhD/comments/1r11qx4/policy_on_tools_and_promotions/

**CiteDuo clears this cleanly:** MIT, public GitHub repo, no trial, no paid tier, no account. Lead with the repo and the license, not the demo.

#### r/selfhosted — ⚠️ allowed, but only on **New Project Friday**

| Item | Finding | Source |
| --- | --- | --- |
| Self-promotion | Rule 2: "Do not spam or promote your own projects too much. We expect you to follow this Reddit self-promotion guideline. **Promoted apps must be production ready and have docs.** No direct ads for web hosting or VPS." | https://old.reddit.com/r/selfhosted/about/rules/ |
| New projects | Rule 6 — **"New Projects - 'New Project Friday' Exceptions**: Only on 'New Project Friday', you may post projects that are younger than 3 months (measured by first public presence, e.g. git commit, social media post, etc.)" | https://old.reddit.com/r/selfhosted/about/rules/ |
| Tools/dashboards | Rule 5: on **Wednesdays** you may post dashboards/tools (even non-self-hosted ones) **if flaired as such**. | https://old.reddit.com/r/selfhosted/about/rules/ |
| Blog links | Rule 4: don't post just a link — add an explanation of why it matters. | https://old.reddit.com/r/selfhosted/about/rules/ |

**This is the sharpest scheduling constraint in the whole playbook.** CiteDuo v0.1.0 is younger than 3 months old, so a standalone r/selfhosted project post is only permitted on **New Project Friday**, and it must be flaired. Posting it on a Tuesday is a straight rule violation. Also verify the "production ready and have docs" bar is genuinely met before claiming it — you have README/ARCHITECTURE/DEPLOYMENT_GUIDE, so say that plainly rather than asserting readiness.

#### r/opensource — ✅ allowed, with a hard disclosure/flair duty

| Item | Finding | Source |
| --- | --- | --- |
| Self-promotion | Rule 2: "We encourage you to be proud of/promote your work to a degree, but we also don't want users using this sub as a link farm... Reddit recommends that <10% of your posts promote your content. We're a little more forgiving, but don't take advantage of it." | https://old.reddit.com/r/opensource/about/rules/ |
| License requirement | Rule 4: repositories linked "MUST have a LICENSE file that MUST be an OSI listed Open Source license". **MIT qualifies.** | https://old.reddit.com/r/opensource/about/rules/ |
| AI content | Rule 3: "All AI-generated content is low-effort and ban worthy." | https://old.reddit.com/r/opensource/about/rules/ |
| Flair | Rule 8: "Use Correct Flairs... **`Promotional`** is when you are sharing a project, yours or otherwise." | https://old.reddit.com/r/opensource/about/rules/ |
| Drive-by posting | Rule 6: accounts with "obviously no intention of engaging in the following discussion may be removed." | https://old.reddit.com/r/opensource/about/rules/ |

**Recommendation:** post with the **`Promotional`** flair and stay in the thread to answer. Don't drop and run — Rule 6 targets exactly that.

#### r/SideProject — ✅ allowed, format is mandatory

- Submission format: *"When submitting a link to a project or startup, please use this format: **[Project name] - [Short description]**."* — https://old.reddit.com/r/SideProject/about/rules/
- The sidebar describes the sub as "for sharing and receiving constructive feedback on side projects". No explicit self-promo ban surfaced, and **no numbered rules list is published on the rules page** — so treat anything beyond the format requirement as **UNVERIFIED**.

#### r/compsci — ⚠️ no rule against it, but the culture is hostile to ads

- A rules-mirror that tracks subreddit rules recorded for r/compsci: *"No rule mentions promotion"*, last read 2026-09-26 — https://threadfox.vip/rules.csv (I could not fetch r/compsci's own rules page; it returned HTTP 403. **Treat as secondary-source / partially verified.**)
- The same source notes regulars "downvote anything that reads as an advert", and that the working approach is to name a tool *inside a genuinely useful answer*, disclose in plain words, and keep it to two or three sentences — https://huntcomments.com/r/compsci (**secondary source, UNVERIFIED against official rules**).
- Moderator clarification that the sub is for CS discussion, not r/Programming: https://www.reddit.com/r/compsci/comments/c15nbn/psa_this_is_not_rprogramming_quick_clarification/

**Recommendation:** do not make r/compsci a primary launch target. If you participate there at all, do it as a substantive comment on a related thread, never as a launch post.

#### r/AskAcademia — ❌ recommend NOT posting

The official rules page could not be fetched (repeated timeouts). What is verifiable is the community's clear hostility to exactly this kind of post:

- A moderator thread titled *"Can we ban posts by app developers fishing for ideas?"* — https://www.reddit.com/r/AskAcademia/comments/1hbg1qg/can_we_ban_posts_by_app_developers_fishing_for/ — with the comment *"We don't come here to provide free testing/feedback for app developers"* and a note that a sibling sub instituted a *"no commercial content or self-promotion"* rule for this reason.
- A 2026-04 mod thread confirms rule 1 is used to delete unsolicited recruitment posts: https://www.reddit.com/r/AskAcademia/comments/1seysuy/mods_can_we_make_the_no_surveysstudy_recruitment/

**Exact wording of r/AskAcademia's self-promotion rule: UNVERIFIED.** Given the demonstrated culture, posting a tool launch there is a bad bet. **Skip it.**

#### r/datasets — ❌ not a fit

- Rule 1: "Any links to a site you own/work for is self-promotion. Do not spam these and always add a disclaimer." — https://old.reddit.com/r/datasets/about/rules/
- The sub is about datasets, not tools; Rule 3 removes low-effort posts. CiteDuo is not a dataset. **Skip it** — posting here would be off-topic and read as link-farming.

#### r/LaTeX, r/Zotero, r/literature_review — ⚠️ rules UNVERIFIED, fit is weak anyway

All three rules pages returned HTTP 403 / crawl failures and could not be verified. Independently, the fit is questionable: CiteDuo is not a LaTeX package, not a Zotero plugin, and not a literature-review service. **Do not post to these without first reading their live sidebars manually.** If you do post to r/Zotero or r/literature_review, lead with the local-first/exportable data story, which is the shared value.

---

## 3. Lobsters — ⚠️ invite-only, and new users are structurally blocked

Source: https://lobste.rs/about

| Item | Finding |
| --- | --- |
| Invite-only | Yes. Registration is by invitation through a public "invitation tree"; every profile shows who invited whom, explicitly "to help identify voting rings". |
| The blocker | "Users are considered 'new' for their first 70 days... New users can't send invites, submit links to domains we haven't seen submitted before, flag stories and comments, suggest edits to story titles and tags, resubmit links that have been seen before, or use tags for meta discussions or that are prone to off-topic stories (**meta rant show announce satire job interview merkle-trees ask culture vibecoding**)." |
| Consequence for CiteDuo | A brand-new Lobsters user **cannot use the `show` tag** and **cannot submit a domain Lobsters hasn't seen before** (`watchdeep.net` and `github.com/benbenlijie/citeduo` both almost certainly qualify). So a Lobsters launch is impossible until you have 70 days of account age, unless an established user submits the link for you. |
| Self-promotion | "It's great to have authors participate in the community, but not to exploit it as a write-only tool for product announcements or driving traffic to your work. As a rule of thumb, **self-promo should be less than a quarter of one's stories and comments**." |
| Tags | "When links or stories are submitted, they must be tagged by the submitter from a list of predefined tags." |
| Spam definition | The flag reason is revealing: spam = content "designed to promote a commercial service" **or** "created without meaningful human authorship". |
| How to actually get in | "If you wrote a link that was posted, please reach out in chat, we'd love to have you join the community." Also: moderation is fully transparent — "There will be no shadow banning" — and all mod actions are public. |

**Recommendation:** treat Lobsters as a **month-3+ channel**, not a launch channel. If you want in earlier, the documented path is to be active in the Lobsters chat and/or have someone else submit CiteDuo because they genuinely found it interesting.

---

## 4. Chinese-language channels

### 4.1 V2EX「分享创造」 — ✅ best Chinese fit, but there is an account-age gate

| Item | Finding | Source |
| --- | --- | --- |
| Official welcome | "V2EX 非常欢迎独立开发者把他们的新作发布到这里。V2EX 汇聚了一群具有强烈好奇心和尝试欲的开发者，把你的新作品发布到这里，可以为你获得第一批用户，并且他们会给你很多有用的反馈。" | https://www.v2ex.com/help/node |
| Official policy on self-promo | "我可以在这里推广自己的网站么？我们非常欢迎创业者在这里发布自己的新作品。**但是如果你在这里注册一个账号，就是为了将自己网站上的链接一个一个搬运过来的话，请停止这样做。**" | https://www.v2ex.com/faq |
| 分享创造 vs 推广 | Marketing content belongs in the dedicated 「推广」 node. "我们理解部分厂商需要把他们的营销内容发到这里... 如果忽略这条规则，那么内容在被管理员发现之后，会被移动到这个节点。如果多次持续忽略这条规则，那么可能会对账号产生影响。" | https://www.v2ex.com/help/node |
| What gets you moved to 推广 | Community-observed triggers: 频繁发布同一个项目, 标题党, 引流 (加群二维码/留下其他无关项目链接), 过于露骨的商业行为 (e.g. "留邮箱送码"). Note "与该项目是否是个人项目或者是否开源无关". | https://www.v2ex.com/t/1058300 |
| **Account-age gate** | "在「分享创造」节点发帖提示要 **30 天**以后才能发。" A user reported this on 2025-11-29, with the reply "这个机制就是为了防止直接注册后就推广的吧。" | https://www.v2ex.com/t/1175853 — **reported by users, not documented on an official rules page; treat as UNVERIFIED-but-likely** |
| AI content | "请不要把 AI 生成的内容发送到这里" | https://www.v2ex.com/about |
| Etiquette | No zero-information replies (顶/沙发/前排/留名). "如果你要教别人做事，请确认那件事情是你自己确实已经做过并且做得很好的。" | https://www.v2ex.com/about |
| Practical steer | "如果是自己开发的软件，第一次在 V 站发布可以发到 分享创造节点。其他时候的推广，都要发到推广节点。" | https://www.v2ex.com/t/1237295 |

**Action:** if the V2EX account is new, start participating **now** — the 30-day clock is the gating item. First-time indie releases go in 分享创造; anything that looks like an update announcement or a download pitch goes to 推广.

### 4.2 知乎 — ✅ technically, but it must not read as promotion

Authoritative sources: 《知乎机构号使用规范（试行）》 https://www.zhihu.com/term/institution-usage · 《知乎协议》 https://www.zhihu.com/term/zhihu-terms · 《知乎视频用户协议》 https://www.zhihu.com/term/video

- **AI content must be declared here — the opposite of Hacker News.** HN bans LLM text outright; 知乎 allows it through the platform's own label. 《人工智能生成合成内容标识办法》 (in force 2025-09-01) Art. 10 requires the poster to declare and use the platform's labelling function (https://www.gov.cn/zhengce/zhengceku/202503/content_7014286.htm), and 知乎's editor offers 「包含 AI 辅助创作」 under 创作声明. The penalty for skipping it, per a gov.cn policy interpretation quoting the platform: 「如果不主动添加，被平台检测到使用 AI 创作，则会被打上标识、**排序置后**或者『折叠』乃至删除封号」 (https://www.gov.cn/zhengce/202503/content_7014404.htm). **排序置后 is the one that matters** — you are publishing for reach, so being deprioritised is the same as not publishing. Write it yourself, or use AI and tick the box.
- Detection is currently weak — 南都 measured that 知乎 did not flag undeclared AI content within 24 hours (https://view.inews.qq.com/a/20250917A03AOU00) — but the rule and its penalty are on the record, so do not count on it.
- 《知乎社区规范》's own canonical page could not be fetched (**UNVERIFIED**), but the linked regulations are explicit about 恶意营销:
  - "多次发布包含联系方式、推广链接等导流信息的低质内容"
  - "相同的回答多次重复发布在不同的问题下"
  - "在较短时间内通过私信频繁邀请站内用户参加机构活动或发送产品推广内容"
  - 处罚: "禁言 1 天、7 天甚至永久封禁"
  — https://www.zhihu.com/term/institution-usage
- Video agreement: "恶意推广内容包括但不限于：发送与视频无关的第三方网址、社交平台、网盘代码等的垃圾广告信息；利用知乎平台进行商业宣传或其他商业行动" → "违规内容会被删除... 情节严重者会直接封禁账号" — https://www.zhihu.com/term/video
- **Disclosure expectation:** 知乎's rules repeatedly constrain *promotional intent*, and the platform's own guidance for institutions stresses not writing the piece as a funnel. A practical, widely-followed norm is to state your affiliation up front (利益相关) — **state the affiliation plainly yourself; the exact mandated wording is UNVERIFIED.**
- Named-account branding: names must not contain slogans or absolute language ("最高级/最佳/第一"), so don't name an account "CiteDuo官方" with a tagline. — https://zhstatic.zhihu.com/org/org-account-guide-2018.10.pdf

**Format that works:** a **long-form answer or 文章** that *answers a real question* ("怎么判断两篇论文之间是否真的有关联？"), with the tool appearing once, naturally, near the end, and **no contact info, no QR code, no "私信我/加群/点链接注册" CTA**. The platform treats a link as high-risk when it functions as 导流/注册/转化, and low-risk when it is a reference. Ship the knowledge, not the funnel.

**Operational plan, self-write outline and pre-publish checklist:** [`zhihu.md`](zhihu.md). A drafted version written to the `zhihu-writer` skill's `writer-v1.20` is in [`zhihu-draft.md`](zhihu-draft.md) — it is LLM-written, so posting it means ticking 「包含 AI 辅助创作」 and accepting the ranking penalty. The outline in `zhihu.md` exists so you can get the same piece without that cost.

**A real question to answer:** 「如何高效完成论文的文献综述，有哪些实用的方法或工具？」 https://www.zhihu.com/question/2043286521067861045 — verify it is still open and not already saturated before writing.

### 4.3 小红书 — ⚠️ allowed for genuine sharing, but 导流 is the red line

- 《小红书社区公约2.0》 (2026-01-19) merges the community and commercial covenants into 「真诚分享 / 友好互动 / 有序经营」, and explicitly opposes 虚假营销, 恶意竞争, 伪造口碑, 伪装素人, and requires **主动标明 AI 辅助工具创作**. — https://cn.chinadaily.com.cn/a/202601/20/WS696eef27a310942cc499bf9f.html
- **《交易导流违规管理细则》 took effect 2025-03-12.** It treats "主动直接引导、暗示间接索取信息引导普通用户至私域或站外三方平台" as 违规导流, across 直播内容、置顶消息、笔记、评论、用户资料. Penalties escalate to 暂时或永久封禁账号. — https://www.163.com/dy/article/JQFFOIMB05568V7Z.html
- 《品牌号社区运营规范》 spells out the forbidden materials: phone numbers, QQ, 微信 links, 淘宝店铺/淘口令, **图片中的二维码**, purchase-method watermarks; plus a ban on 刷量 and 诱导 (e.g. "双击有惊喜") and 骚扰类 mass-posting of contacts. — https://dc.xhscdn.com/file/c947aa537be9e80d802226374b5c710f/品牌号社区运营规范.pdf
- 不当营销 rules also forbid 大字报 titles/covers and 生硬插入营销广告. — http://www.shuaishou.com/school/infos74336.html

**Format that works:** a visually clean 图文笔记 that teaches one concrete thing ("我是怎么发现两篇论文其实共享同一个关键参考文献的"), 真诚分享 tone, a hook title, a short body, and 5–8 topical 话题标签. **No links, no QR codes, no "私信领取", no 微信.** State that you built it (利益相关) — pretending to be a neutral user violates 伪装素人 and is exactly what the platform's 虚假营销 sweeps target. If you want click-through, that is what the platform's own ad products are for.

### 4.4 即刻 — ⚠️ norms only; no official rule page found

- I could **not** locate an official 即刻 社区公约 / rules page. Everything below is either **UNVERIFIED** or clearly dated secondary reporting.
- Product shape (2020 analysis, dated): 即刻 is a 圈子-centric UGC community; content must be strongly 垂类 to its 圈子; the community is described as 和谐/克制 with few ads; official accounts engage warmly with new users. — https://www.woshipm.com/operate/4183376.html · https://www.opp2.com/198852.html
- A Chinese review notes 即刻 "经历过下架整改，内容审核尺度偏谨慎" and that 营销号 interference is relatively low. — https://www.sdmi88.cn/sites/25233.html (**secondary, dated**)

**Recommendation:** treat 即刻 as a low-stakes, conversational channel. Post a short 动态 into a relevant 圈子 (独立开发 / 产品 / 效率工具), written as a person showing something they made — read the 圈子's pinned rules first, since 圈子 can have their own 门槛与规则. Do not treat this as a traffic channel.

### 4.5 少数派 — ✅ the single best Chinese channel, and self-promotion is officially allowed

Source: 少数派创作手册 — https://manual.sspai.com/

- **Explicit permission:** "此外，我们允许独立产品的创作者借助少数派的平台自我宣传，并愿意为其中有潜力的产品提供进一步的帮助和支持。" — https://manual.sspai.com/guides/what-to-write/
- **The one hard rule:** "作为开发者，**不要假扮第三方或用户推荐、评测自己的产品，也请不要发通稿**，这在少数派行不通... 我们强烈建议你，以产品制作者的身份，大方地介绍自己产品的特色。" And there is a dedicated 开发者说 column for exactly this. — https://sspai.com/post/40262
- **Account gate:** posting requires 实名认证; new users are in 「新手上路」 and their posts need editorial confirmation until **3 articles** have been confirmed, after which they become a full 少数派作者. — https://manual.sspai.com/guide/init/
- **Two submission routes:** 「投稿作品」 requires 首发 (first publication) and grants 独占/排他 authorization; 「社区作品」 does not require 首发 but has a lower chance of 首页展示. — https://manual.sspai.com/guides/review-procedure/ · https://manual.sspai.com/guide/proc/
- **Fit warning:** the handbook says they generally do **not** publish "高度专业化的技术内容：如职业编程技巧、行业软件的使用，专业的科学理论探讨" and that the traditional form is **2000–4000 字 图文**. — https://manual.sspai.com/guides/what-to-write/
- 少数派 is also 邀请制 for Matrix community posting; you can apply and note that you want to 自荐产品. — https://sspai.com/post/40262

**Action:** write a 2000–4000 字 hands-on article (**not** a feature list) about a workflow problem in literature review, with screenshots, pitched at 少数派's general technically-literate reader. Because CiteDuo v0.1.0 has never been published elsewhere, it can qualify as 首发 — which matters if you want 首页展示 and the higher 稿酬.

---

## 5. X / Twitter

The "links get suppressed" belief needs to be stated precisely, because the evidence is genuinely split and the situation changed during 2026.

| Claim | Status | Source |
| --- | --- | --- |
| X's released ranking algorithm contains an explicit link penalty | **Not supported.** Analysis of the open-sourced pipeline found "no link-penalty, URL-deboost, or external-link downranking mechanism"; the only link-related term is `click_score`, which is a *positive* signal. Claim is scoped to the published commit. | https://xdoctor.app/learn/p2-reach/link-deboosting (code snapshot verified 2026-06-12) |
| Link posts measurably underperform anyway | **Supported by measurement.** Posts with external links were reported to receive 94% fewer views than comparable posts without them; a separate 18.8M-post study found link posts from non-Premium accounts collapsed to ~0% engagement after March 2025, while Premium accounts still got reach. | https://ppc.land/how-xs-algorithm-silently-kills-your-links-without-explicitly-penalizing-them/ · https://buffer.com/resources/links-on-x/ |
| The mechanism is indirect | The Phoenix model predicts 19 engagement types but **omits external link clicks**, so clicking a link (leaving the platform) generates no downstream likes/replies for the model to learn from — suppression emerges from training data, not a coded rule. | https://ppc.land/x-drops-year-old-link-penalty-musk-tells-zuckerberg-on-platform/ |
| X says it stopped penalising links | **Claimed, not proven.** On 2026-07-28/29, X product chief Nikita Bier said "you do not need to put the links in replies anymore", and Musk replied to Paul Graham: "We haven't for over a year." No formal policy change or independent confirmation. | https://ppc.land/x-drops-year-old-link-penalty-musk-tells-zuckerberg-on-platform/ · https://searchengineoptimization.blog/article/x-says-it-stopped-penalizing-links-a-year-ago-proof-is-thin |

**Practical norms for a solo-dev launch thread:**

1. **Never make post 1 a link.** The first post must stand alone as a complete, interesting idea; if all the value is behind the URL, the post gives nobody a reason to engage. — https://ilo.so/blog/twitter-link-penalty
2. **Put the link in a later post or the final post of the thread**, and keep the rest native. Note this is now contested advice given Musk's claim, but the downside of following it is zero and the downside of not following it is measured.
3. **Prefer native formats** — screenshots, a short screen recording, a small diagram — over bare links. "Content that stays on-platform — threads, images, video — consistently performs better." — https://buffer.com/resources/links-on-x/
4. **Don't ask for likes/reposts/follows.** Same logic as Reddit and HN: it reads as manipulation and, on X, as engagement-bait.
5. **No hashtag stuffing** — one or two relevant tags at most; a wall of tags reads as spam. (Norm, **UNVERIFIED** as a written rule.)
6. **Reply to your own thread to add the link and follow-ups** rather than editing, and stay in the replies.

---

# PART 2 — Ready-to-paste copy

> **Rewrite all of this by hand before posting.** See the warning at the top of this document. These drafts fix the structure, the length, and the claim list; the sentences must be yours, and every claim must be one you can defend in a thread.

## 2.1 Show HN

### Three candidate titles (all ≤80 chars, factual, no superlatives)

1. `Show HN: CiteDuo – Self-hosted paper explorer for how two papers connect` (72 chars)
2. `Show HN: CiteDuo – Self-hosted, local-first citation explorer (Bun + SQLite)` (76 chars)
3. `Show HN: CiteDuo – Ask how two papers are connected, and get an explained path` (78 chars)

Rationale: #1 states the product and the differentiator; #2 leads with the self-hosted/stack angle, which is the HN-native hook; #3 leads with the question. Per the Show HN page, keep it neutral and don't editorialize (https://news.ycombinator.com/showhn.html), and per the YC instructions avoid superlatives entirely (https://news.ycombinator.com/yli.html).

### Body (~250 words, first person — rewrite in your own voice)

> I built CiteDuo because of a specific, small annoyance. I had two papers open — one I was citing, one I was reviewing against — and I wanted to know how they actually relate. Every tool I tried showed me the neighbourhood of one paper. That answers "what's around this paper", which isn't the question I had.
>
> CiteDuo is a self-hosted, local-first paper explorer built around the two-paper question. You pick two papers and it finds the chain that links them, then explains each hop in plain language rather than just drawing an edge. Paths are ranked by evidence, with direct references weighted above citations, above bibliographic coupling, above related-work links, above embedding similarity. It also shows the alternatives, so you can judge whether a connection is robust or coincidental.
>
> The other half is the reading side. It renders arXiv HTML in-app with a section outline and per-paragraph bilingual translation, and there's a reading assistant that is required to call retrieval tools over the paper's full text before it answers — it streams "searching…" and "reading section 3" as it goes, so answers come from the paper rather than the model's memory.
>
> Technically it's deliberately boring: one Bun process and one SQLite file, no account, no cloud, MIT licensed. Data stays on your machine.
>
> What's rough: this is v0.1.0. The hosted demo is a snapshot, and I've intentionally disabled the AI assistant and LLM-backed translation there, so those only work when you run it locally. Relation coverage depends on what Semantic Scholar and OpenAlex return.
>
> I'd genuinely like feedback — especially from anyone who has tried to trace a connection between two papers and given up.

*(Word count ≈ 255. Contains no user numbers, no star counts, no benchmarks, and describes the demo restriction honestly — required, since a mismatch between the post and the demo is what gets you accused of misrepresentation.)*

### First comment as the maker (post immediately after submitting)

> Maker here. A few things I'd rather say up front than have you discover:
>
> - The hosted demo is a **snapshot** and the AI assistant plus LLM translation are **off** there. Those features need a local run.
> - Relation quality is only as good as the upstream metadata, and both citation directions can be sparse for older or non-English work.
> - The evidence weights (direct reference > citation > bibliographic coupling > related work > embedding similarity) are a design choice I made, not a result I measured. If you think the ordering is wrong, I'd like to hear why.
> - It's MIT and one process; if you want to poke at how the path ranking works, the relevant code is in the server package.
>
> I'll be here for the next few hours. Happy to answer anything, including criticism of the approach.

*(Why this shape: HN rewards cheerful self-criticism and technical detail, and discourages defensive or promotional replies — https://news.ycombinator.com/yli.html. Do not add a link here; the submission already carries it.)*

---

## 2.2 Reddit — per-subreddit

General rule for every Reddit post below: disclose that you are the author in the **first two lines**. Undisclosed affiliation is explicitly a violation (https://old.reddit.com/wiki/selfpromotion). Do not reuse the same text across subs — that is the "mass-posting repetitive content" spam pattern (https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam).

### r/PhD — post as-is (Tool Sharing Policy explicitly welcomes OSS repos)

**Title:** `Open-source tool: tracing how two specific papers are actually related (MIT, self-hosted)`

> I'm the developer, so take this with the usual salt.
>
> r/PhD's tool policy says open-source GitHub repos are welcome, so posting this rather than a landing page: https://github.com/benbenlijie/citeduo
>
> The problem it solves: existing citation-graph tools show the neighbourhood of one paper. When I already have two papers in hand, I want to know how *they* relate. CiteDuo finds a path between them and explains each hop, ranks paths by evidence type (direct reference > citation > bibliographic coupling > related work > embedding similarity), and shows alternatives so you can tell a real connection from a coincidence. There's also an in-app arXiv reader and a local-first SQLite store.
>
> It's MIT, one process, no account, no cloud, no paid tier — the mod policy's "no free trial button" test is the reason I think it's appropriate to post here.
>
> What I'd like to know: does this answer a question you actually have, or is it a solution looking for a problem? And is the evidence ranking sane from a domain perspective?
>
> Version is v0.1.0, so expect rough edges. Demo (read-only snapshot, AI features off): https://watchdeep.net/paper-demo/

### r/selfhosted — **only** on New Project Friday, and it must be flaired

**Title:** `[New Project Friday] CiteDuo – self-hosted paper explorer, one Bun process + one SQLite file`

> Author here. Posting under the New Project Friday exception, since this is younger than 3 months (rule 6). Flaired accordingly.
>
> CiteDuo is a local-first academic paper explorer. You give it two papers and it finds and explains the chain connecting them, hop by hop, ranked by evidence type — plus an interactive citation graph, in-app arXiv reading, and an optional local AI reading assistant.
>
> What matters for this sub:
> - One Bun process, one SQLite file. No Docker required, though it'll containerise.
> - No account, no cloud, no telemetry, MIT licensed.
> - The AI assistant and translation are optional and only run against a provider you configure; the rest works fully offline with the local cache.
> - Docs: README, ARCHITECTURE.md and DEPLOYMENT_GUIDE.md are all in the repo.
>
> Repo: https://github.com/benbenlijie/citeduo
> Snapshot demo (AI/translation disabled there): https://watchdeep.net/paper-demo/
>
> Honest limits: v0.1.0; it leans on Semantic Scholar and OpenAlex for metadata, so coverage follows theirs; the first graph build for a new area does a budgeted live crawl and can take a moment.
>
> Happy to answer deployment questions.

### r/opensource — post with the `Promotional` flair

**Title:** `CiteDuo – MIT-licensed, local-first paper explorer (one process, SQLite, no cloud)`

> Disclosure: I'm the author.
>
> CiteDuo is a self-hosted academic paper explorer, MIT licensed, built because I wanted to know how two papers I already had were actually connected — not just what surrounds one of them.
>
> It finds the connecting path and explains each hop, ranks paths by evidence type, shows alternatives, and ships an interactive citation graph plus in-app arXiv reading. Stack is Bun + React + SQLite in a single process; no account and no cloud, so your reading data stays local.
>
> Repo (LICENSE is MIT): https://github.com/benbenlijie/citeduo
>
> It's v0.1.0 and the hosted demo is a snapshot with the AI features switched off — https://watchdeep.net/paper-demo/ — so the real experience is a local install.
>
> I'm around for questions on the architecture or on where I think the project should go next.

### r/SideProject — use the mandatory title format

**Title:** `CiteDuo - a self-hosted explorer that explains how two papers are connected`

> I'm the dev.
>
> I kept running into the same thing: citation tools show you one paper's neighbourhood, but when you have two papers open you want to know how those two relate. So CiteDuo finds the path between them and explains each hop, with the reasoning ranked by evidence type and alternatives shown.
>
> Also in there: an interactive citation graph, in-app arXiv reading with bilingual translation, and a local AI reading assistant that has to call search/section tools before answering.
>
> Bun + React + SQLite, one process, no account, MIT. v0.1.0, so rough.
>
> Repo: https://github.com/benbenlijie/citeduo
> Demo (snapshot; AI off): https://watchdeep.net/paper-demo/
>
> What I'd most like feedback on: whether the two-paper flow is the right thing to lead with, or whether people mostly want the graph.

### r/MachineLearning — post to the `[D] Self-Promotion Thread`, not the main feed

**Use the current recurring thread:** https://www.reddit.com/r/MachineLearning/comments/1q1nko4/d_selfpromotion_thread/

Format the comment as a `[D]`-thread comment (not a submission). Text:

> Author here. CiteDuo is a self-hosted paper explorer for a question I don't think the existing tools answer: given two papers, how are they actually connected? It returns an explained path, hop by hop, ranked by evidence type (direct reference > citation > bibliographic coupling > related work > embedding similarity) and shows alternative paths so you can judge robustness.
>
> Free, open source (MIT), no paid tier. Supports upstream sources: Semantic Scholar and OpenAlex, plus SPECTER2 embeddings and bibliographic coupling for the relation edges.
>
> Repo: https://github.com/benbenlijie/citeduo — v0.1.0, and the hosted demo is a snapshot with AI/translation disabled.
>
> Technical critique welcome, particularly on the evidence-weighting scheme and on whether the retrieval-before-answer constraint on the reading assistant is the right design.

**If you also want a standalone `[P]` post:** it must not be an announcement. Make it a technical write-up with a real claim and real detail — e.g. "How I rank evidence for multi-hop citation paths, and why embedding similarity is last". Rule 3 (no marketing campaigns / SEO) is the clause that gets accounts **permanently banned with all past posts purged**, so a bare launch announcement is exactly the wrong shape: https://old.reddit.com/r/MachineLearning/about/rules/

### r/compsci — do not write a launch post

**Recommendation: don't.** No official rule prohibits it, but I could not verify the rules page, and the community's documented behaviour is to downvote anything that reads as an advert (secondary sources only — see §2.2). If you participate, do it as a two-to-three-sentence disclosure inside a genuine answer to someone's question about tracing citation relationships, never as a standalone launch post.

### r/AskAcademia — ❌ no copy provided, by design

**Do not post here.** The mod team has an open thread proposing to ban app-developer posts and the community response is hostile ("We don't come here to provide free testing/feedback for app developers") — https://www.reddit.com/r/AskAcademia/comments/1hbg1qg/can_we_ban_posts_by_app_developers_fishing_for/. The wording of their self-promotion rule is unverified because the rules page would not load, and posting into that culture risks a ban for no upside. Same for r/datasets, which is for datasets, not tools: https://old.reddit.com/r/datasets/about/rules/

### r/LaTeX / r/Zotero / r/literature_review — no copy until you read their sidebars

Rules are **UNVERIFIED** (pages returned 403). Read the live sidebar manually first. If you post, lead with the local-first and exportable-data angle, and disclose authorship.

---

## 2.3 X / Twitter — 6-post thread outline

Post the whole thread natively; put the repo link in post 5 or 6, not post 1. Do not ask for likes or reposts. Keep one or two hashtags maximum.

1. **The problem, as a story.** "I had two papers open — one I was citing, the other I was arguing with — and I wanted to know how they actually relate. Every citation tool I tried showed me the neighbourhood of *one* paper. That's a different question." (No link.)
2. **The turn.** "So I built the tool I wanted. You give it two papers; it finds the chain between them and explains every hop in plain language instead of just drawing an edge." (Attach a screenshot of the two-paper relation view.)
3. **The technical differentiator.** "The part I care about: paths are ranked by evidence — direct reference > citation > bibliographic coupling > related work > embedding similarity — and it shows you the alternatives, so you can tell a real connection from a coincidence." (Attach the ranked-paths screenshot.)
4. **Second feature, native.** "It also reads arXiv in-app with per-paragraph bilingual translation, and there's a reading assistant that *must* call retrieval tools over the full text before it answers — it streams 'searching…', 'reading section 3' as it goes." (Attach a short screen recording.)
5. **The build + link.** "One Bun process, one SQLite file. No account, no cloud. MIT. v0.1.0, so it's rough. Repo here: github.com/benbenlijie/citeduo" (First link in the thread.)
6. **The honest ask.** "The hosted demo is a snapshot and I turned the AI features off there, so try it locally if you want the full thing. What I want to know: is the two-paper question one you actually have, and is the evidence ranking sane?" (Demo link here, not earlier.)

---

## 2.4 V2EX「分享创造」— full Chinese post

> 发布前请确认：账号是否已满 30 天（见 https://www.v2ex.com/t/1175853 的用户反馈）；不要用 AI 生成这段话；不要加群二维码或其它项目的链接，否则会被管理员移到「推广」节点（https://www.v2ex.com/t/1058300）。

**标题：** `CiteDuo：自托管论文探索工具，回答「这两篇论文到底是怎么关联的」`

**正文：**

> 分享一个自己写的小工具，MIT 开源，本地优先，先放仓库：https://github.com/benbenlijie/citeduo
>
> **为什么做这个**
>
> 起因是一个很具体的别扭：我手里同时开着两篇论文，一篇是我要引的，一篇是我在对比的，我想知道这两篇到底是什么关系。但市面上能找到的引文图工具，基本都在展示「一篇论文的邻域」。它回答的是「这篇论文周围有什么」，不是「这两篇之间有什么关系」。这两个问题不一样。
>
> **它做了什么**
>
> 给它两篇论文，它会找出把它们连起来的那条链，然后**逐跳用自然语言解释**，而不是只画一条边。路径按证据强度排序：直接引用 > 被引 > 文献耦合 > related work > 向量相似度。同时会把**备选路径**也列出来，方便判断这个关联是可靠的还是巧合。
>
> 另外还有交互式引文网络图（节点按 PageRank 加权、Louvain 社区聚类、可以拖时间轴看一个领域长出来）、应用内的 arXiv HTML 阅读与逐段中英对照翻译，以及一个阅读助手——它**必须先调用检索工具（paper_search / paper_section）拿到原文片段才允许回答**，会一边流式输出「正在检索…」「正在读第 3 节」，所以答案是来自论文而不是模型的记忆。
>
> **实现上比较无聊**
>
> Bun + React 18 + SQLite，一个进程，不需要账号，不依赖云。你的阅读数据留在自己机器上。检索源用 Semantic Scholar 和 OpenAlex，按 DOI / arXiv id 合并去重。
>
> **粗糙的地方，先说清楚**
>
> - 还是 v0.1.0，第一次公开发布。
> - 线上演示站是**快照**，而且我在上面**关掉了 AI 助手和 LLM 翻译**，这两个功能需要本地跑才能用：https://watchdeep.net/paper-demo/
> - 关联路径的质量受上游元数据影响，冷门领域和较早的论文可能召回不全。
> - 那套证据权重是我拍的设计选择，不是实验测出来的结论，欢迎质疑排序。
>
> **想听什么**
>
> 主要是想知道：这个「两篇论文之间的关系」是不是你真实遇到的问题，还是我自己想出来的需求？以及从领域角度看，这个证据排序是否合理。有部署问题也可以直接问。

---

## 2.5 知乎 — title + long-form outline (not ad copy)

**标题建议：** `如何判断两篇论文之间是否真的存在关联？聊聊引文路径的证据分层`

**回答/文章结构：**

1. **先把问题问准。** 区分两种完全不同的提问：「这篇论文周围有什么」和「这两篇论文之间是什么关系」。多数工具只回答前者，而后者是你在写综述、做对比、或者审稿时真正会遇到的。
2. **"有关联"其实分好几层，可靠性差别很大。** 依次展开：直接引用关系；共同被引（co-citation）；文献耦合（bibliographic coupling）；作者在 related work 里并列讨论；以及纯语义／向量相似度。重点讲为什么最后一层最容易产生看起来合理、实际牵强的结论。
3. **为什么"给一张图"不够。** 图能表达存在性，表达不了理由。真正有用的是可解释的、逐跳的路径，并且要同时给出**备选路径**，让你能判断这条链是稳健的还是巧合。
4. **一个可操作的方法论：给证据排个序。** 把上面的层次落到一个可复用的判断顺序上（直接引用 > 被引 > 文献耦合 > related work > 向量相似度），并说明这个排序的合理边界——什么时候应该推翻它。
5. **把它做成工具时的工程取舍。** 简述本地优先的意义（数据与笔记留在自己机器上）、单进程 + SQLite 的取舍、以及检索源合并去重的坑。
6. **一个设计上的细节：让 AI 先检索再回答。** 讨论为什么在学术阅读场景里，允许模型凭记忆作答是危险的，以及"强制调用 paper_search / paper_section 之后才允许回答"这种约束在实现上的代价和收益。
7. **局限。** 上游元数据覆盖不均；冷门领域召回不足；证据权重是设计选择而非实验结论。
8. **利益相关声明。** 明确写出「以上工具 CiteDuo 是我开发的，开源地址在……」——放在结尾，克制，一次即可。

**写作纪律（对应知乎规则）：** 全篇不得出现微信号、二维码、邮箱或任何联系方式；不得出现「私信领取」「加群」「点链接注册」这类导流 CTA；同一个回答不要重复发到多个问题下；不要用悬念式、煽动式标题。参考 https://www.zhihu.com/term/institution-usage 与 https://www.zhihu.com/term/video。

---

## 2.6 小红书 — title + body + image-card copy

**形式必须是图文笔记，不得出现链接、二维码、微信、淘宝口令。参考：**
- 《交易导流违规管理细则》 https://www.163.com/dy/article/JQFFOIMB05568V7Z.html
- 《小红书社区公约2.0》 https://cn.chinadaily.com.cn/a/202601/20/WS696eef27a310942cc499bf9f.html

**标题（选一）：**
- `写文献综述时最想问的：这两篇论文到底什么关系？`
- `论文读了几十篇，才发现我一直在问错问题`

**正文：**

> 读文献的时候，我经常卡在同一个地方👇
>
> 手里同时开着两篇论文，一篇是我要引的，一篇是拿来对比的，我很想知道这两篇**到底**是什么关系。
>
> 但我试过的引文工具，几乎都只告诉我「这篇论文周围有什么」。这不是我想问的问题🥲
>
> 后来我自己写了个小工具（我是开发者，先说清楚利益相关🙋），换了个问法：
>
> 📍 给它两篇论文 → 它找出把两篇连起来的那条链
> 📍 每一跳都用大白话解释，不是只画一条线
> 📍 还给**备选路径**，这样能看出这个关联是真的还是碰巧
> 📍 证据分等级：直接引用 ＞ 被引 ＞ 文献耦合 ＞ related work ＞ 向量相似度
>
> 顺便还能看交互式引文网络图，在应用里直接读 arXiv 并做逐段中英对照翻译📖
>
> 数据都在自己电脑上，不要账号，不开源的东西我自己也不放心，所以是 MIT 开源的。
>
> 说实话它还很早期（v0.1.0），我没做什么花哨功能，就想先确认一件事：
>
> **「两篇论文之间的关系」到底是我一个人的执念，还是你也会遇到的问题？**
>
> 有同样困扰的可以评论区聊聊，想知道大家平时都怎么处理两篇论文的对比🙌
>
> #文献综述 #科研工具 #论文写作 #研究生日常 #效率工具 #读文献 #科研笔记 #开源

**图片卡片文案建议（5 张）：**

| 卡片 | 内容 |
| --- | --- |
| 1 封面 | 大字主标题：`两篇论文到底什么关系？`；副标题：`我一直在问错问题`。配一张论文堆叠/两篇论文并排的视觉，干净、不要"大字报"促销感。 |
| 2 痛点 | `引文工具只回答：这篇论文周围有什么` / `我想问的是：这两篇之间是什么关系`。 |
| 3 换问法 | `选两篇 → 找到连接链 → 逐跳解释 → 显示备选路径`。配产品截图。 |
| 4 证据分级 | 用一条清晰的阶梯图：`直接引用 ＞ 被引 ＞ 文献耦合 ＞ related work ＞ 向量相似度`，并标注"顺序是我的设计选择，不是实验结果"。 |
| 5 结尾 | `它还很早期 v0.1.0` / `MIT 开源 · 数据在自己电脑上` / `你觉得这个问题值得做下去吗？`。不要放任何链接或二维码。 |

**发布纪律：** 正文里不要出现链接、域名、二维码、微信/QQ、"私信我"；不要用夸大或绝对化表述；明确说明自己是开发者（避免被判定为"伪装素人"）。

---

## 2.7 即刻 / 少数派 — short Chinese blurbs

**即刻（发到相关圈子的动态，语气自然）：**

> 做了个小工具，解决自己一个很具体的别扭。
>
> 我经常同时开着两篇论文，一篇要引、一篇要对比，然后想知道这两篇到底是什么关系——结果发现所有引文工具都只展示「一篇论文的邻域」。这不是我要问的问题。
>
> 所以 CiteDuo 换了个问法：给它两篇论文，它找出连接的链，逐跳解释，并且给出备选路径，方便判断关联是真靠谱还是碰巧。证据也分了等级（直接引用 > 被引 > 文献耦合 > related work > 向量相似度）。
>
> Bun + SQLite，一个进程，本地优先，MIT，不要账号。v0.1.0，还很糙。
>
> 主要是想问：这个需求是我一个人的怪癖，还是你也遇到过？

**少数派（用于 Matrix「开发者说」／社区作品的开头段落，后面接 2000–4000 字正文）：**

> 这篇文章里，我会以**开发者**的身份，而不是以第三方评测者的身份，介绍一款我自己开发的论文探索工具 CiteDuo，以及它背后那个把「两篇论文之间的关系」当成一等问题的设计思路。
>
> 我不打算把它写成功能清单。我更想聊的是三件事：为什么「一篇论文的邻域」和「两篇论文之间的关系」是两个不同的问题；把「有关联」拆成直接引用、共被引、文献耦合、related work 与语义相似度这几层之后，为什么必须给它们排序、并且必须展示备选路径；以及在工程上，「让阅读助手先检索、再回答」这种约束到底解决了什么、代价是什么。
>
> 我也会明确写出它目前的局限——v0.1.0、上游元数据覆盖不均、线上演示站是快照且关闭了 AI 相关功能。

（对应少数派的硬性要求：不要假扮第三方或用户来推荐、评测自己的产品，也不要发通稿；以产品制作者身份大方介绍。见 https://sspai.com/post/40262）

---

# PART 3 — "Don'ts" checklist

Things that will get this launch flagged, removed, shadowbanned, or the account banned. Tick every one before you post anything.

**Universal**

- [ ] **Don't buy stars, watchers, or forks.** Artificial traction is the thing every platform's abuse detection is tuned for, and on Reddit it's explicitly "vote cheating or manipulation" — https://support.reddithelp.com/hc/en-us/articles/360043066412-Disrupting-Communities
- [ ] **Don't use sockpuppet accounts** to post, comment, or upvote. On Reddit this can get the *domain* banned, not just the account — https://old.reddit.com/wiki/selfpromotion
- [ ] **Don't ask anyone to upvote or comment — anywhere.** HN's FAQ bans it explicitly, including off-site asks — https://news.ycombinator.com/newsfaq.html
- [ ] **Don't let friends post booster comments.** HN: "the worst mistake you can make on HN", and they may bury the thread — https://news.ycombinator.com/yli.html
- [ ] **Don't coordinate the HN post with press coverage or any other launch event.** Explicitly advised against — https://news.ycombinator.com/yli.html
- [ ] **Don't copy-paste the same text to many subreddits.** "Mass-posting repetitive content for the purpose of exposure" is the definition of spam — https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam
- [ ] **Don't hide your affiliation.** Disclose authorship in the first lines, every time — https://old.reddit.com/wiki/selfpromotion
- [ ] **Don't DM people the link.** "Mass-tagging other redditors or sending large amounts of unsolicited chat or private messages" is spam; same norm applies everywhere — https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam
- [ ] **Don't mass-open PRs on awesome-lists.** This is unsolicited promotional outreach, it annoys maintainers, and it is the fastest way to get a repo's domain flagged as a spam source. One well-argued PR to one genuinely appropriate list, after the launch, or nothing.
- [ ] **Don't misrepresent the demo.** The demo is a snapshot and the AI assistant and LLM translation are disabled there. Say so, every time you link it. A post that oversells the demo is the easiest possible "spam/misleading" report.
- [ ] **Don't over-claim benchmarks.** No performance numbers, no accuracy numbers, no "better than X" claims. The evidence-weight ordering is a **design choice**, not a measured result — describe it as such.
- [ ] **Don't quote user numbers or star counts.** There are none to quote, and inventing them is the single most damaging thing you could do.

**Per-channel extras**

- [ ] HN: don't use superlatives ("fastest", "best", "first") — https://news.ycombinator.com/yli.html
- [ ] HN: don't make your username the project or company name — https://news.ycombinator.com/item?id=22336638
- [ ] HN: don't submit a landing page, a blog post, or a newsletter as a Show HN — https://news.ycombinator.com/showhn.html
- [ ] HN: don't post generated or AI-edited text — https://news.ycombinator.com/newsguidelines.html
- [ ] HN: don't create a fresh account for launch day, and don't use HN "primarily for promotion" — the software filters promotional accounts — https://news.ycombinator.com/item?id=38779156
- [ ] r/MachineLearning: don't run anything that could be read as a "strategic marketing campaign" or SEO play — the penalty is a perpetual ban **with all past posts and comments purged** — https://old.reddit.com/r/MachineLearning/about/rules/
- [ ] r/MachineLearning: don't post without the correct tag (`[P]`/`[D]`/`[R]`/`[N]`) — https://www.reddit.com/r/MachineLearning/comments/56hdqi/
- [ ] r/selfhosted: don't post a <3-month-old project outside **New Project Friday**, and don't omit the flair — https://old.reddit.com/r/selfhosted/about/rules/
- [ ] r/opensource: don't forget the `Promotional` flair, and don't post AI-generated text — https://old.reddit.com/r/opensource/about/rules/
- [ ] r/opensource: don't link a repo without an OSI license file (MIT is fine — verify the file is actually present) — https://old.reddit.com/r/opensource/about/rules/
- [ ] r/PhD: don't run "product validation" or "validation interviews"; the policy says that is a permaban — https://old.reddit.com/r/PhD/about/rules/
- [ ] V2EX: don't post AI-generated text, don't add group QR codes or unrelated links, don't repeatedly post the same project — https://www.v2ex.com/about · https://www.v2ex.com/t/1058300
- [ ] V2EX: don't post a first-time indie release into 「推广」 (it goes to 「分享创造」), and don't post updates into 「分享创造」 — https://www.v2ex.com/help/node
- [ ] 知乎: don't include contact details, QR codes, or "私信领取/加群/点链接注册" CTAs; don't post the same answer under multiple questions — https://www.zhihu.com/term/institution-usage
- [ ] 小红书: don't post links, domains, QR codes, WeChat/QQ, or "私信我"; don't use 大字报 covers or 绝对化 language; don't pose as a neutral user — https://www.163.com/dy/article/JQFFOIMB05568V7Z.html · https://cn.chinadaily.com.cn/a/202601/20/WS696eef27a310942cc499bf9f.html
- [ ] 少数派: don't pretend to be a third party reviewing your own product, and don't submit a press release — https://sspai.com/post/40262
- [ ] X: don't make post 1 a link-only post, and don't ask for likes or reposts — https://ppc.land/how-xs-algorithm-silently-kills-your-links-without-explicitly-penalizing-them/ · https://buffer.com/resources/links-on-x/

---

# PART 4 — Sequencing recommendation

## 4.1 Which channel first, and why

**First: Show HN.** Reasons, in order of weight:

1. It is the only channel where the audience is natively interested in *how you built it* rather than *what it does for me*. The Show HN guidelines reward exactly the kind of detail CiteDuo has (one process, SQLite, a design rationale for evidence ranking) — https://news.ycombinator.com/showhn.html
2. It has no day-of-week restriction, no flair requirement, and no account-age gate on the *submission mechanics* — only a participation-history gate.
3. It produces the highest-quality critique, which is precisely what you want before you spend the copy on five other channels. If the "two-paper question" framing is wrong, you want to learn that on HN, not after you've saturated Reddit.
4. It is the one channel where a bad launch costs you nothing permanent. A Show HN that doesn't take off just doesn't take off.

**Second: r/PhD**, because the Tool Sharing Policy explicitly welcomes exactly this artifact (open-source GitHub repo, no trial button) — https://old.reddit.com/r/PhD/about/rules/. That is the highest-confidence green light in the whole playbook, and r/PhD is the closest audience to the actual use case.

**Hold everything else until those two have run.**

## 4.2 What must be true before each post

| # | Channel | Must be true first |
| --- | --- | --- |
| 1 | **Show HN** | (a) Your HN account has genuine, non-promotional history — comments on other people's posts, not just your own submissions. The Show HN restriction is aimed at newcomers and the threshold is deliberately undocumented: https://news.ycombinator.com/showlim. (b) The repo is public, README-accurate, and the demo link works without signup. (c) You have **3+ hours free that day** to sit in the thread — "All you need for HN is enough free time to engage with commenters on that day": https://news.ycombinator.com/yli.html. (d) **Nothing else is launching that day.** (e) Your HN username is not "CiteDuo". |
| 2 | **r/PhD** | The repo has a visible LICENSE file and a clear README; and you have re-read the Tool Sharing Policy quoted in §2.2. Post 2–3 days after HN so you can fold in the best HN criticism. |
| 3 | **V2EX 分享创造** | **The account is ≥30 days old** (reported gate, https://www.v2ex.com/t/1175853). If it isn't, start participating now and defer. Also: no AI-generated text, no QR codes, no unrelated links. |
| 4 | **少数派** | You have done 实名认证, your account has cleared 「新手上路」 (3 confirmed articles), and you have **2000–4000 字** of genuine workflow writing plus screenshots — https://manual.sspai.com/guide/init/ · https://manual.sspai.com/guides/what-to-write/. This is the biggest writing lift; start it early. |
| 5 | **r/selfhosted** | **It is Friday.** Non-negotiable — https://old.reddit.com/r/selfhosted/about/rules/. Docs must actually be complete enough to survive the "production ready and have docs" bar. |
| 6 | **r/opensource** | The LICENSE file is present and OSI-listed (MIT ✅) — https://old.reddit.com/r/opensource/about/rules/. Post with `Promotional` flair and stay to answer. |
| 7 | **r/SideProject** | Title follows `[Project name] - [Short description]` exactly — https://old.reddit.com/r/SideProject/about/rules/. |
| 8 | **知乎** | You have a real long-form answer drafted (see §2.5) with the affiliation declared once at the end and **zero** contact/CTA elements. |
| 9 | **小红书** | Image cards are made, contain no links or QR codes, and the caption states you are the developer. |
| 10 | **即刻** | You've read the target 圈子's pinned rules. Low priority; do it whenever. |
| 11 | **r/MachineLearning** | Post **only** into the `[D] Self-Promotion Thread`, or with a genuine technical post. Latest thread seen: https://www.reddit.com/r/MachineLearning/comments/1q1nko4/d_selfpromotion_thread/ |
| 12 | **r/compsci / r/AskAcademia / r/datasets / r/LaTeX / r/Zotero / r/literature_review** | **Don't** (see §4.4). |
| 13 | **Lobsters** | 70+ days of Lobsters account age AND the ability to use the `show` tag AND the domain already known to Lobsters — or an established member submits it because they found it interesting. Month 3+. https://lobste.rs/about |

## 4.3 Spacing — do not post everywhere the same day

The rule that matters: **each channel must get a version written for that channel on that day, and you must be present in each thread.** That is physically impossible if you post everywhere at once, and copy-pasting is itself the spam pattern. So space them, and leave gaps for discussion to actually happen.

Recommended spacing (adjust to your availability):

- **Day 0 (Tue–Thu):** Show HN. Nothing else. Spend the whole day in the thread.
- **Day 1:** Show HN follow-up only — respond to every late comment. Optionally X thread (it's your own audience, low risk, and it isn't a "coordinated press event").
- **Day 3:** r/PhD. Fold in the HN critique — this is the single best use of the HN thread.
- **Day 5:** 知乎 long-form answer.
- **Day 7:** r/opensource + r/SideProject (different texts, disclose authorship in both).
- **Day 10 (a Friday):** r/selfhosted, under New Project Friday, flaired.
- **Day 12:** 小红书; 即刻 whenever.
- **Day 14+:** 少数派 article (only once the 新手上路 gate is cleared and the piece is genuinely 2000–4000 字).
- **Day 21+:** r/MachineLearning self-promotion thread if it's still the right shape.
- **Month 3+:** Lobsters, once the account qualifies.

**Never:** two subreddits on the same day with the same text; HN and a press post on the same day; anything on the same day as a Product Hunt launch.

## 4.4 7-day follow-up plan

**Day 0 — launch day**
- Post the Show HN with the body in the text field (not the first comment — HN prefers it visible at the top; either is acceptable per https://news.ycombinator.com/item?id=22336638, but the text field is better).
- Stay in the thread. Reply within minutes, not hours. Concede valid criticism fast and cheerfully; the goal is winning the silent audience, not the critic — https://news.ycombinator.com/yli.html.
- **Handling critical comments:** find something to agree with first, even if it's just the positive intention. Never defend the design choice as measured fact — it isn't measured, and saying so earns credit. If someone finds a real bug, thank them and say you'll file it. Do not edit your post to argue.
- Do not post the link anywhere asking for support. Not X, not WeChat, not a Discord.

**Day 1**
- Continue replying. Every unanswered question is a signal to the hivemind that reads as disinterest.
- Open GitHub issues for every concrete bug or request from the thread. Publicly linking issues back into the HN thread is good faith and converts critics into contributors.
- Post the X thread only if you have the energy — it is your own audience and carries no coordination risk. Link goes in post 5 or 6.

**Day 2**
- Write the technical post now, while the arguments are fresh. Working title: something like "Ranking evidence for multi-hop citation paths — and why embedding similarity is last". It should answer the strongest objection from the HN thread head-on. This post is your **permanent** asset: HN and Reddit threads die, but an essay keeps working, and it's the article you'll link from the README later.

**Day 3**
- Publish the technical post on your own site/DEV/GitHub Discussions. Then post to **r/PhD**, linking the repo (not the essay as the primary object — the r/PhD policy is about sharing the tool).
- Watch for the r/PhD thread; reply as the author.

**Day 4–5**
- Publish the 知乎 long-form answer. It should be the technical essay rewritten as an answer to a real question, with the affiliation disclosed once at the end and no CTA.
- **Awesome-lists: submit at most one, and only now.** Criteria: the list genuinely covers self-hosted/OSS tooling (e.g. selfhosted-style lists); you read CONTRIBUTING.md first; you open a normal PR with the same formatting as existing entries; you state in the PR body that you're the author. Do **not** batch-open PRs across lists — that is the pattern that turns maintainers against a project permanently.

**Day 6–7**
- Post r/opensource and r/SideProject with their own texts and correct flairs; stay in both threads.
- Triage GitHub: label issues, merge or close small PRs, and post a short "what I learned from the launch" comment or Discussion. This is what converts launch traffic into something that survives the week.
- Retrospective: which pitch landed — "two papers" or "the graph"? Rewrite the README one-liner to match the language people actually used back at you. That single edit is usually the highest-value output of a launch.

---

## Appendix — all sources fetched

**Hacker News**
- https://news.ycombinator.com/showhn.html
- https://news.ycombinator.com/item?id=22336638 (moderator tips; incl. 2026-03-28 LLM-text edit)
- https://news.ycombinator.com/newsguidelines.html
- https://news.ycombinator.com/newsfaq.html
- https://news.ycombinator.com/yli.html (Launch HN instructions — press-coordination rule, booster-comment rule)
- https://news.ycombinator.com/showlim (current Show HN restriction)
- https://news.ycombinator.com/item?id=47300329 · https://news.ycombinator.com/item?id=47300772 (dang on restricting Show HNs)
- https://news.ycombinator.com/item?id=38779156 (dang on promotional-account filtering)
- https://news.ycombinator.com/item?id=40741609 (dang on not coordinating launches)

**Reddit**
- https://support.reddithelp.com/hc/en-us/articles/205926439-Reddit-Rules (Reddiquette, 9:1)
- https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam
- https://support.reddithelp.com/hc/en-us/articles/360043066412-Disrupting-Communities
- https://support.reddithelp.com/hc/en-us/articles/28012014962580-How-do-I-keep-spam-out-of-my-community
- https://old.reddit.com/wiki/selfpromotion
- https://www.reddit.com/r/modnews/comments/2oamgp/moderators_clarifications_around_our_101/
- https://old.reddit.com/r/MachineLearning/about/rules/ · https://www.reddit.com/r/MachineLearning/comments/56hdqi/ · https://www.reddit.com/r/MachineLearning/comments/1q1nko4/d_selfpromotion_thread/ · https://old.reddit.com/r/machinelearning/
- https://old.reddit.com/r/PhD/about/rules/ · https://www.reddit.com/r/PhD/comments/1r11qx4/policy_on_tools_and_promotions/
- https://old.reddit.com/r/selfhosted/about/rules/
- https://old.reddit.com/r/opensource/about/rules/
- https://old.reddit.com/r/SideProject/about/rules/
- https://old.reddit.com/r/datasets/about/rules/
- https://threadfox.vip/rules.csv · https://huntcomments.com/r/compsci (r/compsci — secondary)
- https://www.reddit.com/r/AskAcademia/comments/1hbg1qg/ · https://www.reddit.com/r/AskAcademia/comments/1seysuy/

**Lobsters**
- https://lobste.rs/about

**V2EX / 中文平台**
- https://www.v2ex.com/help/node · https://www.v2ex.com/faq · https://www.v2ex.com/about
- https://www.v2ex.com/t/1058300 · https://www.v2ex.com/t/1175853 · https://www.v2ex.com/t/1237295
- https://www.zhihu.com/term/institution-usage · https://www.zhihu.com/term/zhihu-terms · https://www.zhihu.com/term/video · https://zhstatic.zhihu.com/org/org-account-guide-2018.10.pdf
- 《知乎社区规范》 canonical page — **failed to fetch, 404/UNVERIFIED**
- https://agree.xiaohongshu.com/h5/terms/ZXXY20221213003/-1 (小红书社区规范) · https://cn.chinadaily.com.cn/a/202601/20/WS696eef27a310942cc499bf9f.html (公约2.0) · https://www.163.com/dy/article/JQFFOIMB05568V7Z.html (导流细则) · https://dc.xhscdn.com/file/c947aa537be9e80d802226374b5c710f/品牌号社区运营规范.pdf
- https://manual.sspai.com/guides/what-to-write/ · https://manual.sspai.com/guides/review-procedure/ · https://manual.sspai.com/guide/proc/ · https://manual.sspai.com/guide/init/ · https://manual.sspai.com/rules/review/ · https://sspai.com/post/40262
- 即刻: **no official 社区公约 found — UNVERIFIED**; context only from https://www.woshipm.com/operate/4183376.html · https://www.opp2.com/198852.html · https://www.sdmi88.cn/sites/25233.html (all dated)

**X / Twitter**
- https://xdoctor.app/learn/p2-reach/link-deboosting
- https://ppc.land/how-xs-algorithm-silently-kills-your-links-without-explicitly-penalizing-them/
- https://ppc.land/x-drops-year-old-link-penalty-musk-tells-zuckerberg-on-platform/
- https://searchengineoptimization.blog/article/x-says-it-stopped-penalizing-links-a-year-ago-proof-is-thin
- https://buffer.com/resources/links-on-x/
- https://ilo.so/blog/twitter-link-penalty
