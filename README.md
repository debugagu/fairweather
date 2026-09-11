# Fairweather

Tells you which days of a trip are good for walking, and what to pack. The
advice assumes a day hiker: outdoors most of the day, away from shelter.

Enter a city and up to fourteen days. You get one line on the whole trip, a
plain-language verdict per day, and a single deduplicated packing list.

**Live:** _add your Vercel URL here after deploying_
**The note:** [`/note`](note.html). Thresholds, reasoning, and what was left out.

---

## Running it locally

Nothing to install, but the app uses ES modules, so it has to be served over
HTTP rather than opened as a file.

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>.

## How it is put together

```
index.html      the app, plus a <template> for each of the five states
note.html       the submission note, readable from the live URL
styles.css      Geist and Geist Mono, blue ground, one working accent
js/api.js       the two Open-Meteo calls, and every error the user might see
js/verdict.js   every threshold in the product, in one file, on purpose
js/icons.js     seven hand-drawn weather glyphs, mapped from WMO codes
js/ui.js        rendering and state switching, the only file that touches the DOM
js/main.js      validation, the search sequence, shareable URLs
```

`js/verdict.js` is the one worth reading. It holds all six concerns, their
thresholds, the tie-break order, the packing rules and the wording. Changing
what the app decides means changing that file only.

## The five states

Four were asked for. "Choosing" exists because "which Springfield did you mean"
is a question rather than an error, and "nothing found" is kept separate from
"error" because a search returning nothing is not a crash.

| State | When |
| --- | --- |
| Empty | Before any search. Explains what the tool does |
| Loading | While either request is in flight |
| Choosing | Two or more places share the name |
| Nothing found | The city does not exist. Deliberately not styled as a failure |
| Error | Bad dates, API down, or rate limited |
| Results | A forecast came back |

## Data

[Open-Meteo](https://open-meteo.com) geocoding and forecast endpoints, called
live from the browser on every search. Both endpoints are open, so there is no
key to configure and nothing runs server side.

## Deploying

Static files. Push to GitHub, import the repo at
[vercel.com/new](https://vercel.com/new), leave every setting alone, deploy.
Full walkthrough in [DEPLOY.md](DEPLOY.md).

## Licence

MIT.
