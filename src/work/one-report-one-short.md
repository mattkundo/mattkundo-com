---
layout: base.njk
title: "One report, one short"
description: "A weekly market report is a nine-minute read almost nobody finishes. This is the pipeline that turns the same week's numbers into a 45-second vertical cut, with every figure on screen read out of the data rather than typed into a caption."
ogType: article
templateEngineOverride: md
---
<header class="topbar">
  <span><a href="/">Matt Kundo</a></span>
  <span>Austin, TX</span>
</header>

<main class="wrap essay">

<h1>One report, one short</h1>

<p class="dek">A weekly market report is a nine-minute read almost nobody finishes. This is the
pipeline that turns the same week's numbers into a 45-second vertical cut, with every figure on
screen read out of the data rather than typed into a caption.</p>

<p class="quiet">Built 2026-09-02 by Matt Kundo. The source article, the data file and the
renderer are all linked below, so you can check any number in the video against the report it
came from.</p>

<figure>
  <video controls playsinline preload="metadata"
         poster="/assets/video/txcp-2026-09-01-poster.jpg"
         style="width:100%;max-width:405px;display:block;margin:0 auto;border-radius:12px">
    <source src="/assets/video/txcp-2026-09-01-short.mp4" type="video/mp4">
  </video>
  <figcaption class="quiet">Texas commercial electricity, week of August 25 to 31, 2026.
  Source: <a href="https://texascommercialplans.com/weekly-market-insights/texas-commercial-electricity-weekly-report-2026-09-01/">the weekly report</a> it repurposes.</figcaption>
</figure>

<h2>Why bother</h2>

<p>I own a small product, <a href="https://texascommercialplans.com">texascommercialplans.com</a>,
that publishes a rate analysis every Monday. The reports are good and they are long. The people
who most need the finding, small business owners shopping their own electricity, are not going to
read nine minutes of term-curve analysis on a phone.</p>

<p>So the question is not whether to make videos. It is whether one asset can become several
without a person retyping the numbers each time, because that retyping is where a caption starts
saying something the article does not support.</p>

<h2>The rule the whole thing is built on</h2>

<p>Every number on screen comes out of a JSON file extracted from the report. The renderer
contains no string literal holding a rate, a plan count or a date. If the report says the median
is 6.69 cents, the video says 6.69 cents. If next week says something else, the video says that
instead, and nobody has to remember to change a caption.</p>

<p>That is not a stylistic preference. A repurposing pipeline that lets a human hand-type the
figure into an overlay is a pipeline that will eventually publish a number the source does not
support, and it will do it on the asset that travels furthest and gets checked least.</p>

<h2>What is actually automated, and what is not</h2>

<p>The extraction step is the one I deliberately left a person in. Pulling the week's average,
median, reprice count and term curve out of the article is mechanical. Deciding <em>which two
numbers carry the story</em> is editorial, and this week the answer was not the headline. The
report's own lead is that five plans repriced and all five moved down. The more useful finding is
buried three paragraphs in: the average is 7.85 cents and the median is 6.69, and the gap between
them is a handful of expensive month-to-month products dragging the mean. A buyer shortlisting a
plan should anchor on 6.69, not 7.85.</p>

<p>Then the term curve, which is genuinely counterintuitive: contracts of 13 to 24 months average
about 6.6 cents, while 1 to 12 month contracts average about 9.1. Locking longer is cheaper right
now, which is backwards from most years. That is the thing worth 45 seconds.</p>

<p>A model can rank those for me. It should not be the last thing that decides.</p>

<h2>The honest part</h2>

<p>I do not produce video. For eight years running my own shop the pattern has been that I spec
the shot and place the asset and the producer produces it, and I have never shot or cut anything
myself. This is the first one I have made end to end.</p>

<p>So I did the thing I would do with any craft I do not have: I hand-made one to find out what
the system needs to do, then built the system. The opening plate is generated. The data sequence
is code. The assembly is ffmpeg. None of that makes me a videographer, and the next cut will be
better than this one for exactly the reason the first of anything is the worst one.</p>

<h2>The pieces</h2>

<ul>
  <li>The renderer, about 150 lines of Python and PIL, with the scene list as
  <code>(function, seconds)</code> pairs so reordering the story is reordering a list.</li>
  <li>A <code>report.json</code> carrying the week's structured facts.</li>
  <li>ffmpeg for assembly. Roughly 25 seconds to render 1,350 frames on a laptop.</li>
  <li>No voiceover, because these are watched muted. No stock footage over the data, because the
  chart is the content. No auto-posting: the file lands on disk and a person decides whether it
  is worth publishing.</li>
</ul>

<p class="quiet">Related: <a href="/writing/the-check-that-could-not-fail/">The check that could
not fail</a>, on the gap between a check that passes and a thing that works. The same instinct is
behind the rule above.</p>

</main>
