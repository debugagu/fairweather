/* ---------------------------------------------------------------------------
   Wiring: form validation, the search sequence, and shareable URLs.
--------------------------------------------------------------------------- */

import { findPlaces, fetchForecast, ApiError } from './api.js';
import { judgeDay, summariseTrip, packingList } from './verdict.js';
import { adjustForAltitude, freezingLevel } from './altitude.js';
import * as ui from './ui.js';

const MAX_DAYS_AHEAD = 14;   // what the brief asks for
const MAX_SPAN = 14;         // and the longest single trip we will read

const form = document.getElementById('search');
const cityInput = document.getElementById('city');
const startInput = document.getElementById('start');
const endInput = document.getElementById('end');
const heightInput = document.getElementById('height');

/* Date bounds -------------------------------------------------------------- */

const today = isoDate(new Date());
const horizon = isoDate(addDays(new Date(), MAX_DAYS_AHEAD));

startInput.min = today;
startInput.max = horizon;
endInput.min = today;
endInput.max = horizon;

// Sensible defaults so the first search is one field of typing, not three.
startInput.value = today;
endInput.value = isoDate(addDays(new Date(), 4));

ui.setNote(`Any window up to ${MAX_DAYS_AHEAD} days ahead, through ${prettyDate(horizon)}.`);

form.addEventListener('submit', event => {
  event.preventDefault();
  run(cityInput.value, startInput.value, endInput.value, heightInput.value);
});

/* Validation --------------------------------------------------------------- */

/* Returns an error sentence, or null if the input is usable. */
function validate(city, start, end, height) {
  ['city', 'start', 'end', 'height'].forEach(f => ui.markInvalid(f, false));

  if (height !== null && (!isFinite(height) || height < 0 || height > 9000)) {
    ui.markInvalid('height', true);
    return 'Height should be a number of metres between 0 and 9000.';
  }

  if (!city.trim()) {
    ui.markInvalid('city', true);
    return 'Type a city first.';
  }
  if (city.trim().length < 2) {
    ui.markInvalid('city', true);
    return 'That is too short to be a city name.';
  }
  if (!start || !end) {
    ui.markInvalid(!start ? 'start' : 'end', true);
    return 'Both dates are needed.';
  }
  if (end < start) {
    ui.markInvalid('end', true);
    return 'The end date is before the start date.';
  }
  if (start < today) {
    ui.markInvalid('start', true);
    return 'Start date must be today or later.';
  }
  if (end > horizon) {
    ui.markInvalid('end', true);
    return `Forecasts only run to ${prettyDate(horizon)}. Bring the end date back.`;
  }
  if (daysBetween(start, end) + 1 > MAX_SPAN) {
    ui.markInvalid('end', true);
    return `Maximum range is ${MAX_SPAN} days.`;
  }
  return null;
}

/* The search sequence ------------------------------------------------------ */

let requestId = 0;   // so a slow reply from an abandoned search cannot land

async function run(rawCity, start, end, rawHeight) {
  const city = rawCity.trim();
  const height = rawHeight === '' || rawHeight === null || rawHeight === undefined
    ? null
    : Number(rawHeight);
  const problem = validate(city, start, end, height);

  if (problem) {
    ui.setNote(problem, 'bad');
    ui.showError('Check the search.', problem, null);
    return;
  }

  ui.setNote(`Any window up to ${MAX_DAYS_AHEAD} days ahead, through ${prettyDate(horizon)}.`);

  const mine = ++requestId;
  ui.showLoading(`Looking up ${city}…`);

  let places;
  try {
    places = await findPlaces(city);
  } catch (err) {
    if (mine !== requestId) return;
    return fail(err, () => run(city, start, end));
  }
  if (mine !== requestId) return;

  if (places.length === 0) {
    ui.markInvalid('city', true);
    return ui.showError(
      `No city called “${city}”.`,
      'Check the spelling, or add a country. Try "Springfield, Illinois".',
      null,
      'notice'
    );
  }

  // Step 1, the product decision. One match is used directly but always named
  // on screen. More than one is handed back to the user, because silently
  // taking the first result is guessing on their behalf.
  if (places.length === 1) {
    return report(places[0], start, end, height, false, mine);
  }

  ui.showChoices(city, places, place => report(place, start, end, height, true, ++requestId));
}

async function report(place, start, end, height, ambiguous, mine) {
  ui.showLoading(`Reading ${place.name} for ${prettyDate(start)} to ${prettyDate(end)}…`);

  let forecast;
  try {
    forecast = await fetchForecast(place, start, end);
  } catch (err) {
    if (mine !== requestId) return;
    return fail(err, () => report(place, start, end, height, ambiguous, ++requestId));
  }
  if (mine !== requestId) return;

  // The forecast describes the town. If a height was given, everything is
  // re-derived for up there before any threshold sees it.
  const base = place.elevation ?? forecast.elevation ?? 0;

  if (height !== null && height < base) {
    ui.markInvalid('height', true);
    return ui.showError(
      `${place.name} already sits at ${Math.round(base)}m.`,
      `Give a height above that, or leave it blank to read the forecast for the town itself.`,
      null,
      'notice'
    );
  }

  const gain = height === null ? 0 : height - base;

  const verdicts = forecast.days.map(day => {
    const hours = forecast.hourly.get(day.date) || [];
    const context = height === null ? null : {
      targetElevation: height,
      freezingLevel: freezingLevel(hours, day.sunrise, day.sunset)
    };
    return judgeDay(adjustForAltitude(day, gain), hours, context);
  });

  ui.showReport(
    {
      place,
      verdicts,
      summary: summariseTrip(verdicts),
      packing: packingList(verdicts),
      ambiguous,
      altitude: height === null ? null : { base, target: height, gain }
    },
    () => run(place.name, start, end, height)
  );

  writeUrl(cityInput.value.trim() || place.name, start, end, height);
  document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function fail(err, retry) {
  if (err instanceof ApiError) {
    return ui.showError(err.title, err.detail, retry);
  }
  console.error(err);
  return ui.showError(
    'Something broke on our side.',
    'That is our fault, not yours. Try the search again.',
    retry
  );
}

/* Shareable URLs ----------------------------------------------------------- */

function writeUrl(city, start, end, height) {
  const query = new URLSearchParams({ city, start, end });
  if (height !== null && height !== undefined) query.set('height', String(height));
  history.replaceState(null, '', `?${query}`);
}

function readUrl() {
  const query = new URLSearchParams(location.search);
  const city = query.get('city');
  const start = query.get('start');
  const end = query.get('end');
  const height = query.get('height');
  return city && start && end ? { city, start, end, height: height ?? '' } : null;
}

/* Dates -------------------------------------------------------------------- */

function isoDate(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function addDays(date, n) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function prettyDate(iso) {
  return new Date(`${iso}T12:00:00`)
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
}

/* Boot ---------------------------------------------------------------------
   Last, not first. A shared link arrives with the search already in it, and
   running it before the module has finished initialising is how you ship a
   page that only breaks for the person you sent it to.
--------------------------------------------------------------------------- */

const fromUrl = readUrl();
if (fromUrl) {
  cityInput.value = fromUrl.city;
  startInput.value = fromUrl.start;
  endInput.value = fromUrl.end;
  heightInput.value = fromUrl.height;
  run(fromUrl.city, fromUrl.start, fromUrl.end, fromUrl.height);
} else {
  ui.showEmpty();
}
