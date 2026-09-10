# Fairweather: the note

**Live:** _add your Vercel URL here_ · **Repo:** _add your GitHub URL here_
The same note is on the live site at `/note`.

---

## Who this advises

Someone walking outdoors for most of the day, away from shelter. A day hiker.

Every threshold below follows from that. Someone on a hike cannot step inside
when the sun turns, cannot leave a ridge quickly, and is working hard the whole
time. 32° is a pleasant afternoon if you are moving between air-conditioned
shops and a real problem four hours into a walk. Numbers tuned to cover both
cases would be too vague to act on, so I picked one.

---

## The workflow, end to end

Everything runs in the browser on each search. No server, no database, no cache.

**1. City name to coordinates.**
The typed name goes to Open-Meteo's geocoding endpoint asking for up to five
matches.

- *No matches.* Error state suggesting a country be added, since that is usually
  what fixes it.
- *One match.* Used, and the resolved place is printed above the results so you
  can see which one it picked.
- *Two or more.* A separate screen listing each option with its region, country,
  population and coordinates. "Springfield, Illinois, population 114,394" is
  enough to choose between; "Springfield" is not.

Population is shown because it is the quickest way to recognise the right place.
It is not used to rank or auto-select. Picking the first result automatically
would be less code, but it guesses on the user's behalf.

**2. Coordinates and dates to a forecast.**
Sent with `timezone=auto`, so days break at local midnight rather than the
reader's. Twelve daily fields come back plus two hourly series.

Dates are bounded at both ends, no earlier than today and no later than fourteen
days out. The same rules are checked again in JavaScript before any request,
because a native date picker can be bypassed. Past dates are rejected rather
than redirected to the archive API, since a forecast and a historical record are
different things.

**3. Six concerns, scored separately.**
Rain, heat, cold, wind, UV and daylight. Each returns a level: 0 not worth
mentioning, 1 worth knowing, 2 changes the plan, 3 do not go. The day takes the
highest level reached.

**4. One concern writes the sentence.**
The highest-scoring one. Ties break on a fixed order (heat, wind, cold, rain,
UV, daylight), ordered by what is most likely to cause actual harm.

**5. The rest go to the packing list.**
Concerns that did not write the sentence still contribute items. A day whose
verdict is about heat will still put a waterproof in the bag if there was rain in
it. The list is deduplicated twice: once by item, and once by redundancy, since a
waterproof shell is already windproof and three litres of capacity covers two.

**6. Hourly data answers "when", not "whether".**
Within daylight hours the app locates the rain and reports *"Rain clears around
13:00. Better to start late."* rather than "70% chance of rain". That is the only
reason the hourly series is fetched.

---

## The thresholds

| Signal | L1 | L2 | L3 | Reasoning |
| --- | --- | --- | --- | --- |
| Rain | ≥35% or ≥1mm | ≥60% and ≥2mm, or ≥5mm | ≥70% and ≥10mm | Both signals are required, because probability on its own is misleading. A 70% chance of 0.5mm is nothing; 12mm at 55% soaks through anything that is not a proper shell. |
| Heat | 28° | 32° | 38° | Apparent temperature rather than the thermometer, since it accounts for humidity and that is what decides how hard the day feels. Above 38° this stops being about comfort. |
| Cold | 7° | 2° | −5° | Apparent *minimum*, which is what you meet at dawn and at rest stops. While moving you generate your own heat. 2° means ice on the path. |
| Wind | 25 km/h | 40 km/h | 60 km/h | Gusts rather than the sustained average. The average affects how tiring the day is; the gust decides whether a route is sensible. |
| UV | 6 | 8 | 11 | Exposure here lasts all day with no shade to step into. Above 8, sunscreen alone does not survive several hours of sweat, so the advice changes to covering up. |
| Daylight | <9.5h | n/a | n/a | Capped at level 1. Short days never make weather bad, they just limit how far you can go. |

**Several problems on one day.** The advice has to stay short. The highest
concern writes it, and at most one other gets a three-word fragment after it,
only if it is serious enough to change what you do, or if the day is mild enough
that two small notes fit, as in *"Start early and finish by midday. Feels like
34° in the afternoon. Also strong wind."* Three are never listed, because past
two it turns back into a weather report.

**Unremarkable days.** Most days are unremarkable. They get the shortest card on
the page, no colour, no marker, and one sentence using the real numbers:
*"Good walking weather. 12° to 20°, dry, light wind."* Not flagging a day is
itself useful information. It is also why colour only appears at levels 2 and 3;
marking every day would make the marks useless.

**Icons.** Seven glyphs drawn as monochrome strokes, mapped from the WMO weather
code Open-Meteo returns and collapsed from about thirty codes, since a 21px glyph
cannot show the difference between light and moderate drizzle. They are
descriptive only and feed into no threshold. An overcast day still reads "good
walking weather", because cloud has little to do with whether a walk is worth
taking.

---

## One thing I left out on purpose

**The hourly chart.** The app fetches an hourly series and draws none of it.
Most weather tools put a 24-hour graph on screen and leave you to interpret it.
Here the same data produces one instruction instead: *"Rain clears around 13:00.
Better to start late."*

Three smaller omissions. Cloud cover is drawn as a glyph but never scored.
Humidity is not shown separately, because apparent temperature already accounts
for it. And the packing list covers weather only, no boots, map or first aid;
listing things you would bring anyway makes the list longer and less useful.

---

## What I would build next

1. **Confidence.** A ten-day forecast is currently treated the same as a two-day
   one. Comparing model runs would let the wording soften as the horizon extends.
2. **Elevation.** The geocoding response includes an elevation the app ignores.
   25 km/h at 2,400 m is not the same day as 25 km/h at sea level.
3. **A second audience.** Not a toggle over these numbers, but a separate set of
   thresholds. Trying to advise a hiker and a wedding guest from one table would
   make both worse.

---

## Built with

Plain HTML, CSS and JavaScript. Five ES modules, no framework, no build step, no
dependencies. Geist and Geist Mono, with figures set in the mono so columns do
not shift between days. Five colours, one of which is only used for warnings.
Deployed as static files on Vercel.

Data is Open-Meteo's free geocoding and forecast endpoints, called live from the
browser on each search. No key, no proxy, nothing stored.

I used Claude Code as a pair while building it. The product decisions, meaning
the audience, the six concerns, where each threshold sits and what to leave out,
are mine. All of them live in one file (`js/verdict.js`).
