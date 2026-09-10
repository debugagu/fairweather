/* ---------------------------------------------------------------------------
   The judgement layer. Every threshold in the product lives in this file, in
   one place, so that it can be argued with.

   WHO WE ARE ADVISING
   One person, on foot, outdoors for most of the daylight hours, some distance
   from shelter. A day hiker. That single choice sets every number below.
   A hiker cannot step into a cafe when the sun turns, cannot call a taxi off a
   ridge, and is working hard the whole time, so heat and wind hurt them at
   values that would be pleasant to somebody walking around a city. If you are
   dressing for a wedding, these numbers are wrong for you.

   HOW A DAY IS SCORED
   Six concerns are tested independently. Each returns a level:

     0  not worth mentioning
     1  worth knowing, does not change the plan
     2  changes the plan
     3  do not go

   The day takes the highest level of any concern. The verdict sentence is
   written by whichever concern is doing the damage. Ties break by the order in
   PRIORITY below, which is ordered by what actually injures a hiker.

   WHY SOME FIELDS ARE MISSING
   Cloud cover is not used at all. It is the field weather apps lead with and it
   is close to irrelevant to whether a day on foot is good; an overcast 19
   degree day is excellent walking. Humidity is not used as its own number
   either, because apparent temperature already contains it and shows it in the
   only form that matters, which is how hard the day will feel.
--------------------------------------------------------------------------- */

const PRIORITY = ['heat', 'wind', 'cold', 'rain', 'uv', 'daylight'];

export const BANDS = {
  0: 'Good',
  1: 'Mostly fine',
  2: 'Plan around it',
  3: 'Avoid'
};

/* Concerns ----------------------------------------------------------------- */

/*
  Rain needs both signals. A high chance of a trace amount is not worth a
  warning, and a large amount at moderate odds is. Probability on its own would
  flag the first and miss the second.
*/
function rain(d) {
  const chance = d.rainChance ?? 0;
  const mm = round(d.rainTotal ?? 0, 1);

  if (chance >= 70 && mm >= 10) {
    return concern('rain', 3,
      `Not worth going out. ${mm}mm of rain, ${chance}% chance.`,
      'Also heavy rain.',
      ['shell', 'packcover', 'nocotton']);
  }
  if ((chance >= 60 && mm >= 2) || mm >= 5) {
    return concern('rain', 2,
      `Take a waterproof. ${chance}% chance of rain, around ${mm}mm.`,
      'Also rain to deal with.',
      ['shell', 'packcover', 'nocotton']);
  }
  if (chance >= 35 || mm >= 1) {
    return concern('rain', 1,
      `Showers possible, ${chance}%. Nothing that should stop you.`,
      'Also showers about.',
      ['shell']);
  }
  return null;
}

/*
  Heat uses apparent temperature rather than the thermometer, since it accounts
  for humidity and that is what decides how hard a day of walking feels.
*/
function heat(d) {
  const t = round(d.feelsMax ?? d.tempMax ?? 0);

  if (t >= 38) {
    return concern('heat', 3,
      `Too hot to walk safely. Feels like ${t}°.`,
      'Also dangerous heat.',
      ['water3', 'salts', 'sunhat', 'spf']);
  }
  if (t >= 32) {
    return concern('heat', 2,
      `Start early and finish by midday. Feels like ${t}° in the afternoon.`,
      'Also very hot.',
      ['water3', 'salts', 'sunhat']);
  }
  if (t >= 28) {
    return concern('heat', 1,
      `Warm at ${t}°. Start early and take extra water.`,
      'Also warm.',
      ['water2']);
  }
  return null;
}

/*
  Cold uses the apparent minimum, which is what you meet at dawn and at every
  stop. While you are moving you generate your own heat.
*/
function cold(d) {
  const t = round(d.feelsMin ?? d.tempMin ?? 0);

  if (t <= -5) {
    return concern('cold', 3,
      `Very cold, ${t}° at dawn. Full winter kit or stay in.`,
      'Also severe cold.',
      ['fleece', 'gloveshat', 'traction']);
  }
  if (t <= 2) {
    return concern('cold', 2,
      `Below freezing at dawn, ${t}°. Expect ice on the path.`,
      'Also freezing at dawn.',
      ['fleece', 'gloveshat']);
  }
  if (t <= 7) {
    return concern('cold', 1,
      `Cold start at ${t}°. Take a warm layer for the first hour.`,
      'Also a cold start.',
      ['fleece']);
  }
  return null;
}

/*
  Gusts rather than the sustained average. The average affects how tiring the
  day is; the gust is what decides whether a route is sensible.
*/
function wind(d) {
  const g = round(d.gustMax ?? d.windMax ?? 0);

  if (g >= 60) {
    return concern('wind', 3,
      `Keep off exposed ground. Gusts to ${g} km/h.`,
      'Also dangerous wind.',
      ['windshell']);
  }
  if (g >= 40) {
    return concern('wind', 2,
      `Gusts to ${g} km/h. Pick a sheltered route.`,
      'Also strong wind.',
      ['windshell']);
  }
  if (g >= 25) {
    return concern('wind', 1,
      `Breezy, gusts to ${g} km/h. Noticeable on open ground.`,
      'Also breezy.',
      []);
  }
  return null;
}

/*
  UV matters more here than for most people, because there is no shade to step
  into and the exposure lasts all day.
*/
function uv(d) {
  const u = round(d.uvMax ?? 0, 1);

  if (u >= 11) {
    return concern('uv', 3,
      `Extreme sun, UV ${u}. Avoid open ground between 11:00 and 16:00.`,
      'Also extreme sun.',
      ['sunhat', 'spf', 'sunsleeves', 'sunglasses']);
  }
  if (u >= 8) {
    return concern('uv', 2,
      `Strong sun, UV ${u}. Hat, sunscreen, and cover your arms.`,
      'Also strong sun.',
      ['sunhat', 'spf', 'sunsleeves', 'sunglasses']);
  }
  if (u >= 6) {
    return concern('uv', 1,
      `UV ${u}. Hat and sunscreen, reapply at lunch.`,
      'Also strong sun.',
      ['sunhat', 'spf']);
  }
  return null;
}

/*
  Daylight never makes a day bad, it just limits how far you can go. Capped at
  level 1 for that reason.
*/
function daylight(d) {
  const hours = daylightHours(d);
  if (hours === null || hours >= 9.5) return null;

  return concern('daylight', 1,
    `Only ${hours.toFixed(1)} hours of daylight. Keep the route short.`,
    'Also short daylight.',
    ['headtorch']);
}

/* Assembling the day ------------------------------------------------------- */

export function judgeDay(day, hoursForDay) {
  const found = [rain(day), heat(day), cold(day), wind(day), uv(day), daylight(day)]
    .filter(Boolean)
    .sort(bySeverityThenPriority);

  const level = found.length ? found[0].level : 0;
  const primary = found[0] || null;

  // When several things go wrong at once the verdict still has to be one
  // sentence, so at most one other concern gets a trailing clause, and only
  // if it is serious enough to change what you do.
  const secondary = found.find(c => c !== primary && (
    c.level >= 2 || (primary.level === 1 && c.level === 1)
  )) || null;

  let sentence;
  if (!primary) {
    sentence = unremarkable(day);
  } else if (secondary) {
    sentence = primary.verdict + ' ' + secondary.clause;
  } else {
    sentence = primary.verdict;
  }

  return {
    date: day.date,
    code: day.code,
    level,
    band: BANDS[level],
    verdict: sentence,
    window: timingNote(day, hoursForDay),
    packIds: found.flatMap(c => c.pack),
    concerns: found.map(c => ({ key: c.key, level: c.level })),
    figures: figures(day)
  };
}

/*
  Most days are unremarkable, and most tools handle them by saying nothing or
  by inventing drama. An unremarkable day here gets the shortest card on the
  page and one confident sentence that uses the real numbers as reassurance.
  Saying "nothing to plan around" is the useful part; the absence of a warning
  is the product.
*/
function unremarkable(d) {
  const lo = round(d.tempMin ?? 0);
  const hi = round(d.tempMax ?? 0);

  if (hi >= 15 && hi <= 24) {
    return `Good walking weather. ${lo}° to ${hi}°, dry, light wind.`;
  }
  if (hi < 15) {
    return `Cool and dry, ${lo}° to ${hi}°. Nothing to worry about.`;
  }
  return `Fine for walking. ${lo}° to ${hi}° and dry.`;
}

/*
  Timing. The difference between "it will rain" and "go out after two", which
  is the whole reason the hourly data is fetched. Only daylight hours are
  considered, because the rest is not walking time.
*/
function timingNote(day, hours) {
  if (!hours || hours.length === 0) return '';

  const first = clockHour(day.sunrise) ?? 7;
  const last = clockHour(day.sunset) ?? 19;
  const inDaylight = hours.filter(h => h.hour >= first && h.hour <= last);
  if (inDaylight.length < 4) return '';

  const wet = inDaylight.filter(h => (h.rainChance ?? 0) >= 50).map(h => h.hour);

  if (wet.length === 0 || wet.length === inDaylight.length) {
    // Nothing useful to say about rain timing, so fall back to sun timing.
    const fierce = inDaylight.filter(h => (h.uv ?? 0) >= 7).map(h => h.hour);
    if (fierce.length >= 2) {
      return `Strongest sun between ${clock(fierce[0])} and ${clock(fierce[fierce.length - 1] + 1)}.`;
    }
    return '';
  }

  const wetStart = wet[0];
  const wetEnd = wet[wet.length - 1];
  const morningOnly = wetEnd <= (first + last) / 2;
  const afternoonOnly = wetStart >= (first + last) / 2;
  const scattered = wet.length > 2 && (wetEnd - wetStart + 1) > wet.length + 1;

  if (scattered) return 'Showers on and off through the day.';
  if (morningOnly) return `Rain clears around ${clock(wetEnd + 1)}. Better to start late.`;
  if (afternoonOnly) return `Dry until about ${clock(wetStart)}, then rain. Start early.`;
  return `Rain mostly between ${clock(wetStart)} and ${clock(wetEnd + 1)}.`;
}

/* The trip in one line ----------------------------------------------------- */

export function summariseTrip(verdicts) {
  const n = verdicts.length;
  const bad = verdicts.filter(v => v.level === 3);
  const tricky = verdicts.filter(v => v.level === 2);
  const clear = verdicts.filter(v => v.level <= 1);
  const usable = clear.length + tricky.length;

  let line;

  if (n === 1) {
    const only = verdicts[0].level;
    line = only === 3 ? 'One day, and it is a write-off.'
         : only === 2 ? 'One day, and it needs planning.'
         : 'One day, and it looks good.';

  } else if (bad.length === n) {
    line = `None of these ${n} days is good for walking.`;

  } else if (bad.length === 0 && tricky.length === 0) {
    line = `All ${n} days look good for walking.`;

  } else if (bad.length === 0 && clear.length === 0) {
    line = `All ${n} days need planning around.`;

  } else if (bad.length === 0 && clear.length >= tricky.length) {
    line = `Mostly good. ${phrase(tricky, n, 'lead')} ${verb(tricky.length, 'needs', 'need')} planning around, and the rest ${verb(clear.length, 'is', 'are')} fine.`;

  } else if (bad.length === 0) {
    line = `Only ${clear.length} of the ${n} days ${verb(clear.length, 'is', 'are')} straightforward. ${capitalise(phrase(tricky, n, 'rest'))} ${verb(tricky.length, 'needs', 'need')} planning.`;

  } else {
    line = `${usable} of the ${n} days ${verb(usable, 'is', 'are')} usable. ${capitalise(phrase(bad, n, 'rest'))} ${verb(bad.length, 'is', 'are')} a write-off.`;
  }

  return { line, sub: spine(verdicts) };
}

/*
  Naming days only helps up to about three. Past that a reader stops parsing
  the list and starts counting it, so we count for them, as "the other four"
  when the sentence has already named a total to subtract from, and as a plain
  count when it has not.
*/
function phrase(subset, tripLength, position) {
  if (subset.length === 0) return 'none of them';
  if (subset.length <= 3) return joinWords(subset.map(v => dayName(v.date, tripLength)));
  return position === 'rest'
    ? `the other ${subset.length}`
    : `${subset.length} of the ${tripLength} days`;
}

function capitalise(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function verb(count, singular, plural) {
  return count === 1 ? singular : plural;
}

/** The supporting numbers, kept to one muted line under the verdict. */
function spine(verdicts) {
  const lows = verdicts.map(v => v.figures.tempMin).filter(isNumber);
  const highs = verdicts.map(v => v.figures.tempMax).filter(isNumber);
  if (!lows.length || !highs.length) return '';

  const wettest = verdicts.reduce((a, b) => (b.figures.rainTotal > a.figures.rainTotal ? b : a));
  const rainBit = wettest.figures.rainTotal >= 1
    ? ` Wettest day is ${dayName(wettest.date, verdicts.length)}, around ${round(wettest.figures.rainTotal, 1)}mm.`
    : ' Little or no rain on any day.';

  return `${Math.min(...lows)}° to ${Math.max(...highs)}° across the trip.${rainBit}`;
}

/* Packing ------------------------------------------------------------------ */

/*
  One list for the trip, not one per day. Ordered by how much you would regret
  leaving it behind, and deduplicated twice over: once by item, and once by
  redundancy, because a waterproof shell is already windproof and three litres
  of water capacity already covers two.
*/
const ITEMS = {
  shell:      { rank: 1,  label: 'Waterproof shell' },
  packcover:  { rank: 2,  label: 'Dry bag or pack cover' },
  nocotton:   { rank: 3,  label: 'Quick-dry layers, no cotton' },
  windshell:  { rank: 4,  label: 'Windproof shell' },
  fleece:     { rank: 5,  label: 'Insulating midlayer' },
  gloveshat:  { rank: 6,  label: 'Gloves and a warm hat' },
  traction:   { rank: 7,  label: 'Traction for ice underfoot' },
  water3:     { rank: 8,  label: 'Three litres of water capacity' },
  water2:     { rank: 9,  label: 'Two litres of water capacity' },
  salts:      { rank: 10, label: 'Electrolyte tablets' },
  sunhat:     { rank: 11, label: 'Brimmed hat' },
  spf:        { rank: 12, label: 'SPF 50 and lip balm' },
  sunsleeves: { rank: 13, label: 'Long-sleeved sun layer' },
  sunglasses: { rank: 14, label: 'Sunglasses' },
  headtorch:  { rank: 15, label: 'Head torch' }
};

// If the key is packed, the value is redundant and gets dropped.
const SUPERSEDES = { shell: 'windshell', water3: 'water2' };

export function packingList(verdicts) {
  const triggeredBy = new Map();

  verdicts.forEach(v => {
    new Set(v.packIds).forEach(id => {
      if (!triggeredBy.has(id)) triggeredBy.set(id, []);
      triggeredBy.get(id).push(v.date);
    });
  });

  Object.entries(SUPERSEDES).forEach(([winner, loser]) => {
    if (triggeredBy.has(winner)) triggeredBy.delete(loser);
  });

  return [...triggeredBy.entries()]
    .filter(([id]) => ITEMS[id])
    .sort((a, b) => ITEMS[a[0]].rank - ITEMS[b[0]].rank)
    .map(([id, dates]) => ({
      label: ITEMS[id].label,
      why: because(dates, verdicts)
    }));
}

function because(dates, verdicts) {
  const total = verdicts.length;
  if (dates.length === total) return total === 1 ? 'For the one day' : 'For every day of the trip';
  if (dates.length > 3) return `For ${dates.length} of the ${total} days`;
  const named = dates.map(d => dayName(d, total));
  return `For ${joinWords(named)}`;
}

/* Small helpers ------------------------------------------------------------ */

function concern(key, level, verdict, clause, pack) {
  return { key, level, verdict, clause, pack };
}

function bySeverityThenPriority(a, b) {
  if (b.level !== a.level) return b.level - a.level;
  return PRIORITY.indexOf(a.key) - PRIORITY.indexOf(b.key);
}

function figures(d) {
  return {
    tempMin: round(d.tempMin),
    tempMax: round(d.tempMax),
    feelsMax: round(d.feelsMax),
    rainChance: round(d.rainChance),
    rainTotal: round(d.rainTotal ?? 0, 1),
    uvMax: round(d.uvMax, 1),
    gustMax: round(d.gustMax ?? d.windMax),
    daylight: daylightHours(d)
  };
}

function daylightHours(d) {
  if (!d.sunrise || !d.sunset) return null;
  const up = new Date(d.sunrise).getTime();
  const down = new Date(d.sunset).getTime();
  if (!isFinite(up) || !isFinite(down) || down <= up) return null;
  return (down - up) / 3600000;
}

function clockHour(stamp) {
  if (!stamp || !stamp.includes('T')) return null;
  return Number(stamp.split('T')[1].slice(0, 2));
}

function clock(hour) {
  const h = Math.max(0, Math.min(24, hour));
  return `${String(h).padStart(2, '0')}:00`;
}

export function dayName(isoDate, tripLength) {
  const d = new Date(`${isoDate}T12:00:00`);
  if (tripLength <= 7) return d.toLocaleDateString('en-GB', { weekday: 'long' });
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function joinWords(words) {
  if (words.length === 0) return '';
  if (words.length === 1) return words[0];
  if (words.length === 2) return `${words[0]} and ${words[1]}`;
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

function round(value, places = 0) {
  if (!isNumber(value)) return null;
  const f = 10 ** places;
  return Math.round(value * f) / f;
}

function isNumber(v) {
  return typeof v === 'number' && isFinite(v);
}
