# Fairweather

A forecast reader for one specific person: someone on foot, outdoors for most
of the daylight hours, with nowhere convenient to duck inside. A day hiker.

You give it a city and a stretch of up to fourteen days. It gives you back one
line on the whole trip, a plain-language verdict for each individual day, and a
single deduplicated packing list — not a wall of numbers.

**Live:** _add your Vercel URL here after deploying_
**The note:** [`/note`](note.html) — thresholds, reasoning, and what was left out.

---

## Running it locally

There is no build step and there are no dependencies, but the app uses ES
modules, so it has to be served over HTTP rather than opened as a file.

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>.

## How it is put together

```
index.html      the app, plus a <template> for each of the five states
note.html       the submission note, readable from the live URL
styles.css      two typefaces, five colours
js/api.js       the two Open-Meteo calls, and every error the user might see
js/verdict.js   every threshold in the product, in one file, on purpose
js/ui.js        rendering and state switching — the only file that touches the DOM
js/main.js      validation, the search sequence, shareable URLs
```

`js/verdict.js` is the one worth reading. It holds all six concerns, their
thresholds, the tie-break order, the packing rules and the copy. Changing what
the product believes means changing that file and nothing else.

## The five states

Four were asked for. The fifth exists because "which Springfield did you mean"
is a question, not an error.

| State | When |
| --- | --- |
| Empty | Before any search |
| Loading | While either request is in flight |
| Choosing | Two or more places share the name |
| Error | City not found, bad dates, or the API failed |
| Results | A forecast came back |

## Data

[Open-Meteo](https://open-meteo.com) geocoding and forecast endpoints, called
live from the browser on every search. No API key, no proxy, no server, no
cache, nothing stored.

## Deploying

Static files. Push to GitHub, import the repo at
[vercel.com/new](https://vercel.com/new), leave every setting alone, deploy.
Full walkthrough in [DEPLOY.md](DEPLOY.md).

## Licence

MIT.
