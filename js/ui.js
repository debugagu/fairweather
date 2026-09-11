/* ---------------------------------------------------------------------------
   Everything that touches the DOM.

   Five states, not four: empty, loading, choosing a city, error, results.
   The extra one exists because "which Springfield" is a question, not an
   error, and it deserves its own screen.
--------------------------------------------------------------------------- */

import { iconFor, iconName, iconSvg } from './icons.js';


const results = document.getElementById('results');

function template(id) {
  return document.getElementById(id).content.cloneNode(true);
}

function swap(node) {
  results.replaceChildren(node);
}

function slot(root, name) {
  return root.querySelector(`[data-slot="${name}"]`);
}

/* States ------------------------------------------------------------------- */

export function showEmpty() {
  results.setAttribute('aria-busy', 'false');
  swap(template('t-empty'));
}

export function showLoading(message) {
  results.setAttribute('aria-busy', 'true');
  const node = template('t-loading');
  if (message) node.getElementById('loading-line').textContent = message;
  swap(node);
}

export function showError(title, detail, onRetry, tone = 'error') {
  results.setAttribute('aria-busy', 'false');
  const node = template('t-error');

  // A search that found nothing is not a failure, and colouring it like one
  // makes people think the app broke.
  if (tone === 'notice') {
    const section = node.querySelector('.state');
    section.classList.remove('state--error');
    section.classList.add('state--notice');
    section.removeAttribute('role');
  }

  slot(node, 'title').textContent = title;
  slot(node, 'detail').textContent = detail;

  const retry = node.querySelector('[data-action="retry"]');
  if (onRetry) {
    retry.addEventListener('click', onRetry);
  } else {
    retry.remove();
  }
  swap(node);
}

export function showChoices(query, places, onPick) {
  results.setAttribute('aria-busy', 'false');
  const node = template('t-choose');
  slot(node, 'title').textContent = `${places.length} places called “${query}”.`;

  const list = slot(node, 'list');
  places.forEach(place => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'choice';

    const name = document.createElement('b');
    name.textContent = place.name;

    const meta = document.createElement('span');
    meta.textContent = describe(place);

    button.append(name, meta);
    button.addEventListener('click', () => onPick(place));
    li.append(button);
    list.append(li);
  });

  swap(node);
}

function describe(place) {
  const where = [place.region, place.country].filter(Boolean).join(', ');
  const coords = `${place.latitude.toFixed(2)}, ${place.longitude.toFixed(2)}`;
  const people = place.population
    ? `population ${place.population.toLocaleString('en-GB')}`
    : 'no population on record';
  return [where, people, coords].filter(Boolean).join(' · ');
}

/* Results ------------------------------------------------------------------ */

export function showReport({ place, verdicts, summary, packing, ambiguous }, onRechoose) {
  results.setAttribute('aria-busy', 'false');
  const node = template('t-results');

  slot(node, 'place').textContent = place.label;
  slot(node, 'summary').textContent = summary.line;
  slot(node, 'summary-sub').textContent = summary.sub;

  // If we resolved the city without asking, say so and offer a way back. The
  // user should always be able to see which place we picked.
  const rechoose = node.querySelector('[data-action="rechoose"]');
  if (ambiguous) {
    rechoose.hidden = false;
    rechoose.addEventListener('click', onRechoose);
  } else {
    rechoose.remove();
  }

  const heroStats = slot(node, 'hero-stats');
  tripStats(verdicts).forEach(([term, value]) => heroStats.append(statCell(term, value)));

  const days = slot(node, 'days');
  verdicts.forEach((v, i) => {
    const card = renderDay(v);
    card.querySelector('.day').style.setProperty('--stagger', `${Math.min(i, 8) * 45}ms`);
    days.append(card);
  });

  const list = slot(node, 'packing');
  if (packing.length === 0) {
    const li = document.createElement('li');
    const label = document.createElement('b');
    label.textContent = 'Nothing extra needed.';
    const why = document.createElement('span');
    why.textContent = 'Nothing beyond your usual kit.';
    li.append(label, why);
    list.append(li);
  } else {
    packing.forEach(item => {
      const li = document.createElement('li');
      const label = document.createElement('b');
      label.textContent = item.label;
      const why = document.createElement('span');
      why.textContent = item.why;
      li.append(label, why);
      list.append(li);
    });
  }

  swap(node);
}

function renderDay(v) {
  const node = template('t-day');
  const li = node.querySelector('.day');

  if (v.level >= 2) li.classList.add('day--flagged');

  const key = iconFor(v.code);
  const glyph = slot(node, 'icon');
  glyph.className = 'wx';
  glyph.title = iconName(key);
  glyph.append(iconSvg(key));

  slot(node, 'weekday').textContent = weekday(v.date);
  slot(node, 'date').textContent = shortDate(v.date);
  slot(node, 'temp').textContent = `${v.figures.tempMax}° / ${v.figures.tempMin}°`;
  slot(node, 'band').textContent = v.band;
  slot(node, 'verdict').textContent = v.verdict;
  slot(node, 'window').textContent = v.window;

  const figures = slot(node, 'figures');
  rows(v.figures).forEach(([term, value]) => figures.append(statCell(term, value)));

  return node;
}

function statCell(term, value) {
  const wrap = document.createElement('div');
  const dt = document.createElement('dt');
  dt.textContent = term;
  const dd = document.createElement('dd');
  dd.textContent = value;
  wrap.append(dt, dd);
  return wrap;
}

/* The three figures worth knowing before reading any individual day. */
function tripStats(verdicts) {
  const lows = verdicts.map(v => v.figures.tempMin).filter(n => typeof n === 'number');
  const highs = verdicts.map(v => v.figures.tempMax).filter(n => typeof n === 'number');
  const totalRain = verdicts.reduce((sum, v) => sum + (v.figures.rainTotal || 0), 0);
  const goodDays = verdicts.filter(v => v.level <= 1).length;

  // "Worth having" is the summary sentence's phrase and means anything that is
  // not a write-off. This counts something narrower, so it needs its own label.
  return [
    ['Range', lows.length ? `${Math.min(...lows)}° to ${Math.max(...highs)}°` : 'n/a'],
    ['Rain over the trip', `${Math.round(totalRain)}mm`],
    ['Need no planning', `${goodDays} of ${verdicts.length}`]
  ];
}

/*
  Numbers second, and only the six that any of the thresholds actually read.
  Showing a field we do not use would imply we considered it.
*/
function rows(f) {
  const out = [
    ['Feels like', `${f.feelsMax}°`],
    ['Rain', `${f.rainChance ?? 0}% · ${f.rainTotal}mm`],
    ['UV', `${f.uvMax ?? 0}`],
    ['Gusts', `${f.gustMax ?? 0} km/h`]
  ];
  if (f.daylight !== null) out.push(['Daylight', `${f.daylight.toFixed(1)} h`]);
  return out;
}

function weekday(iso) {
  return new Date(`${iso}T12:00:00`)
    .toLocaleDateString('en-GB', { weekday: 'long' });
}

function shortDate(iso) {
  return new Date(`${iso}T12:00:00`)
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/* Form feedback ------------------------------------------------------------ */

const note = document.getElementById('range-note');

export function setNote(message, tone = 'plain') {
  note.textContent = message;
  note.dataset.tone = tone;
}

export function markInvalid(field, invalid) {
  const input = document.getElementById(field);
  if (input) input.setAttribute('aria-invalid', invalid ? 'true' : 'false');
}
