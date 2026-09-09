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
  1: 'Good, with caveats',
  2: 'Plan around it',
  3: 'Pick another day'
};

/* Concerns ----------------------------------------------------------------- */

/*
  Rain. Judged on probability AND volume, never probability alone. A 70 per
  cent chance of half a millimetre is a non-event; 12mm at 55 per cent will
  soak through anything that is not a proper shell. The pairing is the point.
*/
function rain(d) {
  const chance = d.rainChance ?? 0;
  const mm = round(d.rainTotal ?? 0, 1);

  if (chance >= 70 && mm >= 10) {
    return concern('rain', 3,
      `Sit this one out. ${mm}mm at ${chance}% will soak through everything you own.`,
      'and the rain is relentless',
      ['shell', 'packcover', 'nocotton']);
  }
  if ((chance >= 60 && mm >= 2) || mm >= 5) {
    return concern('rain', 2,
      `Go, but go waterproof. ${chance}% chance and about ${mm}mm to shed.`,
      'with real rain to shed',
      ['shell', 'packcover', 'nocotton']);
  }
  if (chance >= 35 || mm >= 1) {
    return concern('rain', 1,
      `Showers passing through at ${chance}%, nothing that should stop you.`,
      'and showers pass through',
      ['shell']);
  }
  return null;
}

/*
  Heat, read off apparent temperature rather than the thermometer, because
  what matters is the load on someone already working. 28 is warm work. 32 is
  where a full day of exertion starts costing you. 38 is not a judgement call.
*/
function heat(d) {
  const t = round(d.feelsMax ?? d.tempMax ?? 0);

  if (t >= 38) {
    return concern('heat', 3,
      `Too hot to walk safely. ${t}° feels-like is heat exhaustion territory once you are moving.`,
      'in genuinely dangerous heat',
      ['water3', 'salts', 'sunhat', 'spf']);
  }
  if (t >= 32) {
    return concern('heat', 2,
      `Start at first light and be finished by midday. It reaches ${t}° with no shade to hide in.`,
      'and it gets seriously hot',
      ['water3', 'salts', 'sunhat']);
  }
  if (t >= 28) {
    return concern('heat', 1,
      `Warm work at ${t}°. Go early and carry more water than feels necessary.`,
      'and it will be warm',
      ['water2']);
  }
  return null;
}

/*
  Cold, read off the apparent minimum, because a hiker meets the minimum at
  dawn and at every stop, not while moving. 7 is a layer at rest. 2 means ice
  underfoot and hands that stop working. Below -5 this stops being about
  comfort.
*/
function cold(d) {
  const t = round(d.feelsMin ?? d.tempMin ?? 0);

  if (t <= -5) {
    return concern('cold', 3,
      `Properly cold at ${t}°. This is a day for equipment, not enthusiasm.`,
      'in serious cold',
      ['fleece', 'gloveshat', 'traction']);
  }
  if (t <= 2) {
    return concern('cold', 2,
      `Freezing at dawn at ${t}°. Expect ice underfoot and useless fingers for the first hour.`,
      'and it freezes overnight',
      ['fleece', 'gloveshat']);
  }
  if (t <= 7) {
    return concern('cold', 1,
      `Cold start at ${t}°. You will want a layer for the first hour and every stop after.`,
      'and it starts cold',
      ['fleece']);
  }
  return null;
}

/*
  Wind, judged on gusts rather than the sustained average. The average tells
  you how tiring the day is; the gust tells you whether you stay upright on
  exposed ground, and that is the one that decides the route.
*/
function wind(d) {
  const g = round(d.gustMax ?? d.windMax ?? 0);

  if (g >= 60) {
    return concern('wind', 3,
      `Stay off anything exposed. ${g} km/h gusts will take you off your feet on a ridge.`,
      'in dangerous wind',
      ['windshell']);
  }
  if (g >= 40) {
    return concern('wind', 2,
      `Hard going into ${g} km/h gusts. Pick a sheltered route and expect to work for it.`,
      'and the wind will fight you',
      ['windshell']);
  }
  if (g >= 25) {
    return concern('wind', 1,
      `Breezy at ${g} km/h. You will feel it on open ground.`,
      'and there is a breeze on open ground',
      []);
  }
  return null;
}

/*
  UV. A hiker is the person this index was written for: exposed, all day, at
  altitude often enough. 6 is a hat. 8 is cover, because sunscreen alone does
  not survive eight hours of sweat. 11 burns bare skin in about ten minutes.
*/
function uv(d) {
  const u = round(d.uvMax ?? 0, 1);

  if (u >= 11) {
    return concern('uv', 3,
      `Extreme sun at UV ${u}. Bare skin burns in roughly ten minutes.`,
      'under extreme sun',
      ['sunhat', 'spf', 'sunsleeves', 'sunglasses']);
  }
  if (u >= 8) {
    return concern('uv', 2,
      `Very high sun at UV ${u}. Cover up properly, sunscreen alone will not last the day.`,
      'under hard sun',
      ['sunhat', 'spf', 'sunsleeves', 'sunglasses']);
  }
  if (u >= 6) {
    return concern('uv', 1,
      `Strong sun at UV ${u}. Hat on, and reapply at lunch.`,
      'and the sun is strong',
      ['sunhat', 'spf']);
  }
  return null;
}

/*
  Daylight. Never the reason a day is bad, but it silently decides how long a
  route can be, and it is the one figure a forecast app never gives you in a
  useful form. Capped at level 1 for that reason.
*/
function daylight(d) {
  const hours = daylightHours(d);
  if (hours === null || hours >= 9.5) return null;

  return concern('daylight', 1,
    `Only ${hours.toFixed(1)} hours of light, so a long route finishes in the dark.`,
    `and only ${hours.toFixed(1)} hours of light`,
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
    sentence = primary.verdict.replace(/\.$/, '') + ', ' + secondary.clause + '.';
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
    return `About as good as walking weather gets. ${lo}° to ${hi}°, dry, and no wind worth the name.`;
  }
  if (hi < 15) {
    return `Cool and clear at ${lo}° to ${hi}°. Nothing to plan around.`;
  }
  return `Good day to be out. ${lo}° to ${hi}° and dry, with nothing to plan around.`;
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
      return `Sun is hardest ${clock(fierce[0])} to ${clock(fierce[fierce.length - 1] + 1)}. Be under something then.`;
    }
    return '';
  }

  const wetStart = wet[0];
  const wetEnd = wet[wet.length - 1];
  const morningOnly = wetEnd <= (first + last) / 2;
  const afternoonOnly = wetStart >= (first + last) / 2;
  const scattered = wet.length > 2 && (wetEnd - wetStart + 1) > wet.length + 1;

  if (scattered) return 'Showers come and go all day rather than sitting in one block.';
  if (morningOnly) return `Wet until about ${clock(wetEnd + 1)}, then it clears. Start late.`;
  if (afternoonOnly) return `Dry until about ${clock(wetStart)}, then it turns. Start early.`;
  return `Worst of it between ${clock(wetStart)} and ${clock(wetEnd + 1)}.`;
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
         : only === 2 ? 'One day, and it needs planning around.'
         : 'One day, and it is a good one.';

  } else if (bad.length === n) {
    line = `Not a window worth booking. None of these ${n} days is worth a full day on foot.`;

  } else if (bad.length === 0 && tricky.length === 0) {
    line = `A clean run. All ${n} days are good walking, with nothing to plan around.`;

  } else if (bad.length === 0 && clear.length === 0) {
    line = `Nothing here is straightforward. All ${n} days need planning around.`;

  } else if (bad.length === 0 && clear.length >= tricky.length) {
    line = `Mostly good. ${phrase(tricky, n, 'lead')} ${verb(tricky.length, 'needs', 'need')} planning around, and the rest ${verb(clear.length, 'is', 'are')} straightforward walking.`;

  } else if (bad.length === 0) {
    line = `A demanding window. Only ${clear.length} of the ${n} days ${verb(clear.length, 'is', 'are')} straightforward, and ${phrase(tricky, n, 'rest')} ${verb(tricky.length, 'needs', 'need')} real planning.`;

  } else {
    line = `${usable} of the ${n} days ${verb(usable, 'is', 'are')} usable, and ${phrase(bad, n, 'rest')} ${verb(bad.length, 'is', 'are')} a write-off.`;
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
    : ' No day carries more than a millimetre of rain.';

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
