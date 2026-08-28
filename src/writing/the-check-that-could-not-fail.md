---
layout: base.njk
title: "The check that could not fail"
description: "I built a deterministic check for whether my agents' outbound writing sounded wrong, measured it, and deleted it. Then I found the same shape in a data pipeline that had spent weeks publishing deletions it had invented."
templateEngineOverride: md
---
<header class="topbar">
  <span><a href="/">{{ site.name }}</a></span>
  <span>{{ site.location }}</span>
</header>

<main class="wrap essay">

<h1>The check that could not fail</h1>

<p class="dek">I built a deterministic check for whether my agents' outbound writing sounded wrong, measured it, and deleted it. Then I found the same shape in a data pipeline that had spent weeks publishing deletions it had invented.</p>

<p class="quiet">Written 2026-08-28 by Matt Kundo. Every figure here is reproduced from the
system it describes, and the commands are in the text.</p>

Here are two emails to a client's developer. One is warm. The other opens with an all-caps header and tells him his side ends at the form submit. My compliance gate, which every outbound message from my agent system runs through, returns exactly the same thing for both.

```python
from tools import compliance

warm = """Thanks for turning the form around so fast, that unblocked the tracking work.

I'd recommend keeping the parameter names as they are for now. My uploader looks
them up by name, so a rename breaks the import on my side.
"""

blunt = """THE ONE ADDITION

Please do not rename the Parameter Names. Your side ends at the form submit.
This is wrong and you must fix it before Friday.
"""

compliance.full_check(warm,  "mkdm")["all"]   # []
compliance.full_check(blunt, "mkdm")["all"]   # []
```

Two empty lists. I re-ran it this morning and the output is identical, character for character.

In August my system sent the second one. Not that exact text, but that register: all-caps section headers, "please do not rename", "your side ends at". Every technical fact in it was correct. The tone was wrong, and tone is the part that costs you the working relationship rather than a rewrite.

So I wrote the rule down. Friendly technical consultant, never an internal systems operator. Then I did the responsible-looking thing, which was try to enforce it.

That's the cheap version of this problem and I can show it to you in ten lines. The expensive version is further down, in a pipeline that spent weeks recording deletions it had invented and publishing them as market news.

## What the gate is actually for

I want to be fair to it first, because it earns its place. The system behind it drafts client email, builds reports, publishes posts and sends cold outreach, nearly all of it unattended, and in production the gate has fired 1,135 flags, applied 438 automatic sanitizations and hard blocked 147 outputs. It catches em dashes, first-person plural, exclamation marks, semicolons, and a list of words that read as machine-written. Those are literal strings, and a regex sees literal strings well.

It's also more porous than the sentence "nothing ships without passing the gate" implies, and I should be precise about that since the whole point here is not letting a green run mean more than it means. Em dashes and the per-client hard rules block a send. The style rules, pronouns and exclamation marks and word choice, are flag-only by design, because a word choice must never brick an irreversible send. Put a "we" and an exclamation mark in that warm email and it fails, but it still goes out, and two rows land on a dashboard nobody was going to read that day.

None of which is a bug. The pronoun rule is right, because I'm one person and "we" implies a team that doesn't exist. Both rules fire exactly as designed. They're just orthogonal to the only property that mattered on that thread. This essay trips the pronoun rule too, on the quoted "we" I just used to explain it, because a string rule can't tell a use from a mention.

## The one piece that looked gateable

Of everything in the posture rule, one piece looked mechanical: no all-caps section headers. Typography is a thing a regex can genuinely see, so I built it.

Then I measured it against 30 realistic outbound shapes, which is the step that's easiest to skip when a check looks obviously correct. It flagged 23 of them.

It flagged "EQUAL HOUSING OPPORTUNITY", which real estate marketing is legally required to carry. It flagged "UNSUBSCRIBE". It flagged a CAN-SPAM postal address block. My cold outreach path is legally obliged to include an unsubscribe mechanism, a physical address and a clear advertisement disclosure, and my brand new quality check was reading the compliance furniture as a tone defect.

That's a flag on more than three quarters of copy that was mostly fine. Ship it and every agent downstream learns what every engineer learns from a panel that's always red, which is to stop reading it.

## The finding that mattered more

The loud failure was the false positive rate. The quiet one was worse.

Before any style check runs, text goes through a function called `_prose_only` that strips code fences, markup, entities and URLs, so a semicolon inside an inline CSS rule doesn't trip the semicolon rule on every send. That's necessary, because my weekly client reports ship as rendered HTML.

I measured one. Both numbers below come out of a single command against the repo's own fixture:

```python
html = report_render.render_weekly_html(doc)
len(html), html.count("\n")        # 6422, 0

prose = compliance._prose_only(html)
len(prose), prose.count("\n")      # 751, 0
```

The renderer emits the whole document as one line. It assembles with `"".join` throughout and writes `<br>` where a break belongs, so the newline count is zero no matter how long the report gets. After the strip, 751 characters of prose and still not a line break in it.

A header check is line based. It asks whether a short line is shouting. On every weekly report my system has ever produced it would have seen exactly one line, 751 characters long, correctly concluded that no, that isn't a header, and returned green. Every time. Without ever evaluating anything.

That's the failure I actually care about. A false positive is loud, and somebody complains. A check that is structurally incapable of failing is silent, it reports success, and it quietly accumulates a track record that looks like evidence.

Two more findings came out of the same afternoon and neither is small. The check was quadratic on ordinary HTML, because it reached for the obvious `<[^>]+>` to strip tags and that pattern rescans to end of string from every unterminated `<`. It ran synchronously on the agent's event loop at the write gate, so on a long audit dump it would have stalled the write it was supposed to be protecting. And its own disclaimer, the sentence saying this is a flag and not a block, sat in a description field that the tool layer truncates at 200 characters. The caveat I wrote specifically for the agent reading the result was the part the agent never saw. If you build gates for models to read, the message is a payload with a budget, not a comment.

The check never reached main. What shipped that day was the rule in plain prose, injected into every agent's dispatch preamble, plus 51 tests. Those tests don't check that the prose is good. They check that the rule is written down once and that it actually reaches the session doing the writing. The original email went out with no voice guidance loaded at all, because its task type had no entry in the playbook map and the lookup returned an empty list without complaining. Nothing was violated, because nothing was loaded.

## The same shape, in a pipeline

Here's the expensive one.

I own a Texas commercial electricity price comparison site. A scheduled extraction run feeds a Supabase table of plans, and a weekly market report writes itself off that table behind a publish gate. One blocking rule in that gate requires at least four citations to authoritative primary sources: ERCOT, the PUC, the EIA, FERC. It's a good rule.

Then I read a post of mine titled "255 Texas Commercial Electricity Plans Retired". Four authoritative citations. Cleared every other rule in the checklist. Average position 4.8 in Search Console, which is page one.

Its entire thesis was an artifact of my own scraper.

The extractor is an AI research query, and when I measured 30 consecutive scheduled runs it returned somewhere between 11 and 36 percent of the active plans each time. Only about 14 of 32 providers showed up in any given run. The lifecycle rule retired a plan after it went missing a few times, and at two runs a day that meant roughly a day and a half between "the extractor didn't find it" and "the database says it's gone". One week the table recorded 2,287 rows created and 3,395 deactivated against 736 genuinely active plans. Every one of those deactivations was a row in a report that called itself market news.

The root cause was not the model, which is the part I got wrong on the first pass. I blamed provider coverage, measured it, and was wrong. The real defect is that the upsert key includes a plan name generated by the extractor as free text. "Websaver Business 12" comes back as "WebSaverBusiness 12", or "Commercial Fixed 12 Month" as "Commercial Fixed 12-Month", and the rename orphans the old row and mints a new one. No amount of better extraction fixes a key that isn't stable.

I tested the obvious fix and killed it. Upgrading the extractor to the premium processor tier, which is the move anyone would try first, returned fewer plans on every provider that returned anything, renamed them so that none of the keys matched at all, and ran two to eight times slower. Read-only trial, about a dollar, and worth every cent for the answer.

What shipped was a coverage floor that skips the lifecycle step entirely when a run sees less than half of what it saw before, so stale rows linger instead of churning. Stale beats fabricated. It isn't a steady state, and I'd rather say that than call it fixed. Alongside it, the publication rules changed: a plan counts as added only if it's still active, and as removed only if it was an established offering the provider no longer lists under any service area. Same underlying table, publishable numbers, and the raw counts now go to a data-quality block instead of a headline.

The citation rule measures sourcing. Sourcing is not truth. Adding citations to that post made it worse rather than better, because it made it look more trustworthy.

## And in a sentence

The third one is smaller and it's the one I'd have bet against. Reviewing cold outreach copy, I hit the sentence "that is the part that costs you, not the missing page."

That campaign's central rule is that I never assert a prospect has no website, because the signal I derive that from is wrong for 16 to 27 percent of them. The banned phrase list catches the explicit forms, "you don't have a website" and the rest. A definite article plus an adjective walks straight through. That sentence cleared send readiness, the outreach compliance check, CAN-SPAM, the em dash rule and every pinned test, and it still asserted the forbidden claim as settled fact.

Presupposition rides on grammar, not vocabulary, so no string rule reaches it.

## What I build instead

Deleting a check is only half an answer, so here's the other half.

Where the property I care about is a judgment, I let a model make it and I constrain the shape of the answer rather than the words. My publishing pipeline runs an LLM quality judge whose verdict is allow-listed to one exact string, so anything unexpected holds the draft. A non-pass that names no concrete fix gets treated as incoherent rather than trusted, because a judge that can only say "worse" teaches you nothing and trains the reader to skip it. A reply that won't parse falls back to a deterministic scorer instead of counting as a failure, because that's missing data, not a bad article.

The one I'm fondest of came out of watching agents cite the page they had just written as proof of the conclusion that page asserts, which only proves the page exists. So I built a reviewer that takes the claim and the evidence list, actually fetches each cited artifact, and asks a clean-context model whether those artifacts establish the claim. Three decisions in it are the whole thing. It's advisory and blocks nothing, because the agent reading it has to want to read it. It fails open to "unverifiable" and never to "supported", since laundering a fetch failure into reassurance is pure downside. And an "unsupported" verdict that names no specific gap gets downgraded to "unverifiable", because an unactionable opinion is exactly what teaches an agent to stop reading a reviewer. The judge gets no tools, only text.

I also kept every gate I had and narrowed one. The replacement for the citation problem blocks a plan count only when it shows up in the H1, the title tag or the opening sentence, because a churn figure is fine as supporting color and wrong as a thesis. Getting that boundary right took three passes. The first version read the whole opening paragraph and flagged three perfectly sound reports that led on the rate index and mentioned churn afterwards. Narrowing it to the place a reader takes the claim from was the fix, and a rate figure appearing before a churn verb in that sentence now reads as subordinating it.

What actually changed is what I let a green run mean. My gates are evidence about em dashes, pronouns, citation counts and headline position. They're zero evidence about tone, about whether a number means anything, or about what a sentence quietly takes for granted. For those I have a written checklist, a human read, and one question I ask about every new check before I trust it: what would a passing run look like if the thing I care about were completely broken?

If the answer is "identical", I'm not measuring it.


<hr>

<p class="quiet">I'm Matt Kundo. I build content and marketing systems, and I'm currently
winding down my consultancy for an in-house role.
<a href="/">More about the work</a> ·
<a href="https://www.linkedin.com/in/mattkundo">LinkedIn</a> ·
<a href="https://github.com/mattkundo">GitHub</a></p>

</main>
