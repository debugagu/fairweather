# Fairweather: the note

**Live:** _add your Vercel URL here_ · **Repo:** _add your GitHub URL here_
The same note is readable on the live site at `/note`.

---

## Who this advises

A day hiker. One person, on foot, outdoors for most of the daylight hours, some
distance from shelter.

That is the only decision in this project that really mattered, because every
threshold follows from it. A hiker cannot step into a café when the sun turns,
cannot get off a ridge quickly, and is working hard the whole time. 32° is a
pleasant afternoon if you are wandering between air-conditioned shops and a real
problem four hours into a walk. Advice that tries to serve both serves neither,
so the app says on its own front page that if you are going to a wedding, you
should ignore it.

---

## The workflow, end to end

Everything happens in the browser on each search. No server, no database, no
cache, so a stale response is not a failure mode this product has.

**1. The city becomes a question, not an answer.**
The typed name goes to Open-Meteo's geocoding endpoint asking for up to five
matches, and the app treats what comes back as a list.

- *No matches.* An error state that suggests adding a country, because that is
  what actually fixes it.
- *One match.* Used, but the resolved place is printed above the results. You
  always know which town you are reading about.
- *Two or more.* A screen of its own, showing region, country, population and
  coordinates for each. "Springfield, Illinois, population 114,394" is enough to
  choose between; "Springfield" is not.

Population is there because it is the fastest way for a person to recognise the
place they meant. It is not used to rank or auto-select. Silently taking the
first result would have been three fewer lines of code and a worse product.

**2. The forecast is fetched for exactly the dates asked for.**
Coordinates and both dates go to the forecast endpoint with `timezone=auto`, so
days break at local midnight rather than wherever the reader happens to be.
Twelve daily fields come back plus two hourly series.

The date inputs are bounded at both ends, no earlier than today and no later
than fourteen days out, and anything the browser lets through anyway is caught
again in JavaScript before a request is made, because a native date picker is a
suggestion rather than a guarantee. Past dates are refused rather than quietly
redirected to the archive API: a forecast and a historical record are different
products.

**3. Six concerns are scored independently.**
Rain, heat, cold, wind, UV and daylight. Each reads the fields it needs and
returns a level: 0 not worth mentioning, 1 worth knowing, 2 changes the plan,
3 do not go. The day takes the highest level any concern reached.

**4. One concern writes the sentence.**
Whichever scored highest writes the verdict. Ties break on a fixed order (heat,
wind, cold, rain, UV, daylight) ranked by what actually injures someone on foot
rather than by what feels dramatic.

**5. The rest go in the packing list.**
Concerns that did not write the sentence are not thrown away. Every triggered
concern contributes items to one trip-wide list, so a day whose verdict is about
heat still puts a shell in your bag if there was rain in it. The list is
deduplicated twice: once by item, and once by redundancy, because a waterproof
shell is already windproof and three litres of water capacity already covers
two.

**6. Hourly data answers "when", not "whether".**
The only reason hourly values are fetched is timing. Within daylight hours the
app finds where the rain sits and says "wet until about 13:00, then it clears,
start late" rather than "70% chance of rain". That is the difference between a
forecast and a decision.

---

## The thresholds, and why they sit there

| Signal | L1 | L2 | L3 | Reasoning |
| --- | --- | --- | --- | --- |
| Rain | ≥35% or ≥1mm | ≥60% and ≥2mm, or ≥5mm | ≥70% and ≥10mm | Probability alone lies. 70% chance of half a millimetre is a non-event; 12mm at 55% soaks through anything that is not a proper shell. Both signals, or neither. |
| Heat | 28° | 32° | 38° | Apparent temperature, not the thermometer, because what matters is the load on someone already working. 32° is where a full day of exertion starts costing you. 38° is not a judgement call. |
| Cold | 7° | 2° | −5° | Apparent *minimum*, because a hiker meets the minimum at dawn and at every stop, not while moving. 2° means ice underfoot and hands that stop working. |
| Wind | 25 km/h | 40 km/h | 60 km/h | Gusts, not the sustained average. The average tells you how tiring the day is; the gust decides whether you stay upright on exposed ground, and that is what changes the route. |
| UV | 6 | 8 | 11 | A hiker is exactly who this index was written for: exposed, all day. At 8, sunscreen alone does not survive eight hours of sweat, so the advice becomes cover rather than cream. |
| Daylight | <9.5h | n/a | n/a | Capped at level 1 on purpose. Short days never make weather bad, but they quietly decide how long a route can be, and no forecast app reports it usefully. |

**When several things go wrong at once.** The verdict still has to be one
sentence, so the rule is strict. The dominant concern writes it; exactly one
other concern may add a trailing clause, and only if it is serious enough to
change what you do, or if the day is mild enough that two small notes fit
comfortably. A serious sentence is never given company. Three concerns are never
listed, because at that point the sentence stops being a verdict and becomes a
weather report, which is the thing this product exists to avoid.

**What an unremarkable day says.** Most days are unremarkable, and most tools
handle them by saying nothing or by inventing drama. Here they get the shortest
card on the page, no colour, no marker, and one confident sentence that uses the
real numbers as reassurance: *"About as good as walking weather gets. 10° to
18°, dry, and no wind worth the name."* The absence of a warning is the product.
That is also why colour appears only on days scoring 2 or 3: if everything is
marked, nothing is.

**The icons.** Seven glyphs, drawn by hand as monochrome strokes, mapped from
the WMO weather code Open-Meteo returns and collapsed from roughly thirty codes,
because the difference between light and moderate drizzle is not something a
21px glyph can carry. They are descriptive and nothing else. No icon touches any
threshold. An overcast day still reads "about as good as walking weather gets",
because cloud has almost nothing to do with whether a walk is worth taking.

---

## One thing I deliberately left out

**The hourly chart.** The app fetches an hourly series and draws none of it.
Every other weather tool puts a 24-hour graph on screen and leaves you to read
it, which is exactly the wall of numbers this product was built against. The
hourly data is used instead to produce one sentence: *"wet until about 13:00,
then it clears, start late."* Same information, already decided.

Three smaller omissions follow the same logic. Cloud cover is drawn as a glyph
but never scored. Humidity is not shown as its own number, because apparent
temperature already contains it in the only form that matters, which is how hard
the day will feel. And the packing list is weather-driven only: no boots, no
map, no first aid. Padding it with things you would take anyway would make it
longer and less trustworthy.

---

## What I would build next

1. **Confidence, not just values.** A ten-day-out forecast is currently treated
   exactly like a two-day-out one, which is wrong. The next version would compare
   model runs and soften the language as the horizon extends. "Probably" is real
   information and the app currently withholds it.
2. **Terrain.** The geocoding response already carries an elevation the app
   ignores. A 25 km/h wind at 2,400 m is a different day from the same wind at
   sea level; altitude would let the thresholds move rather than staying fixed.
3. **A second audience, properly.** Not a toggle bolted onto these numbers, but a
   separate table and a separate voice. The moment this app tries to advise the
   hiker and the wedding guest from one set of thresholds, both get worse advice.

---

## Built with

Plain HTML, CSS and JavaScript. Five small ES modules, no framework, no build
step, no dependencies. Geist for text and Geist Mono for figures, so numbers that
change between days do not shift the columns they sit in. Five colours, one of
which has a job. Deployed as static files on Vercel.

Data is Open-Meteo's free geocoding and forecast endpoints, called live from the
browser on every search. No key, no proxy, nothing stored, nothing cached.

I used Claude Code as a pair while building it. The product decisions, meaning
the audience, the six concerns, where each threshold sits and what to leave out,
are mine. Every threshold lives in one file (`js/verdict.js`) so it can be argued
with.
