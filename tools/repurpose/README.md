# One report in, one short out

A weekly market report on texascommercialplans.com is a 9-minute read that almost nobody
finishes. This turns the same week's numbers into a 45-second vertical cut.

The rule the whole thing is built on: **every number on screen comes out of `report.json`,
never out of a script I typed.** The renderer has no string literals holding a rate, a plan
count or a date. If the report says the median is 6.69 cents, the video says 6.69 cents,
and if next week says something else the video says that instead. A repurposing pipeline
that lets a human retype the figure into a caption is a pipeline that will eventually
publish a number the article does not support.

## Run it

    python3 render_short.py frames
    ffmpeg -framerate 30 -i frames/f%05d.png -c:v libx264 -pix_fmt yuv420p -crf 18 out.mp4

Roughly 25 seconds to render 1,350 frames on an M-series laptop.

## What is in report.json

The structured facts the article already contains: the tracked average and the prior week's
average, the median, how many plans repriced and how many of those moved up, and the term
curve as an array of bands. Extracting that is the only judgment step, and it is the step
worth keeping a human in, because deciding which two numbers carry the story is editorial.

## Scenes

Defined as `(function, seconds)` in `SCENES`. Reordering the story is reordering that list.
Each scene fades in and out at its own boundary, so cuts never hard-flash.

## What this deliberately does not do

No voiceover, because these are watched muted. No stock footage over the data, because the
chart IS the content. No auto-posting: the file lands on disk and a person decides whether
it is worth publishing. The B-roll opening plate is generated separately and composited in;
it carries no data and can be swapped without touching the numbers.
