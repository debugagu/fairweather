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
  0: 'Good day',
  1: 'Mostly fine',
  2: 'Plan around it',
  3: 'Do not go'
};

/* Concerns ----------------------------------------------------------------- */

/*
  Each concern writes three sentences, in the same order every time:

    1. What kind of day this is.
    2. What the number actually means once you are out in it.
    3. What to do about it.

  The middle sentence is the one that matters. A forecast can tell you 6mm; it
  cannot tell you that 6mm soaks a fleece and stops there. That translation is
  the only thing this app adds, so it gets its own sentence.
*/

/*
  Rain needs both signals. A high chance of a trace amount is not worth a
  warning, and a large amount at moderate odds is.
*/
function rain(d) {
  const chance = d.rainChance ?? 0;
  const mm = round(d.rainTotal ?? 0, 1);

  if (chance >= 70 && mm >= 10) {
    return concern('rain', 3,
      `Not a day to be out. ${mm}mm over the day is past the point where waterproofs keep helping, and tracks start moving underfoot. Take the day indoors and walk tomorrow instead.`,
      'There is heavy rain with it.',
      ['shell', 'packcover', 'nocotton']);
  }
  if ((chance >= 60 && mm >= 2) || mm >= 5) {
    return concern('rain', 2,
      `You will get wet, but it is still a day out. Around ${mm}mm at ${chance}%, which is enough to soak a fleece through and not much more than that. Shell on from the start, and keep one dry layer in the pack.`,
      'There is real rain with it.',
      ['shell', 'packcover', 'nocotton']);
  }
  if (chance >= 35 || mm >= 1) {
    return concern('rain', 1,
      `Showers around, nothing that changes the plan. A ${chance}% chance means you might walk through one and might not. Take a light shell and carry on.`,
      'There are showers around too.',
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
      `Too hot to be walking. ${t}° with the humidity in it is the range where sweating stops cooling you and heat exhaustion comes on quickly. This is not a day to push through.`,
      'It is dangerously hot with it.',
      ['water3', 'salts', 'sunhat', 'spf']);
  }
  if (t >= 32) {
    return concern('heat', 2,
      `Front-load this one. It climbs to ${t}° by early afternoon, and on open ground there is nowhere to sit it out. Start at first light and be somewhere cool by midday.`,
      'It gets very hot with it.',
      ['water3', 'salts', 'sunhat']);
  }
  if (t >= 28) {
    return concern('heat', 1,
      `Warm enough to notice. ${t}° is fine while you are moving, but it adds up across a long day and catches people out late. Start early and carry a litre more than you think you need.`,
      'It runs warm too.',
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
      `Serious cold. ${t}° at dawn takes the feeling out of bare hands inside twenty minutes, and anything wet freezes on contact. Go properly equipped or go another day.`,
      'It is severely cold with it.',
      ['fleece', 'gloveshat', 'traction']);
  }
  if (t <= 2) {
    return concern('cold', 2,
      `Hard frost overnight. It sits at ${t}° at first light, so expect ice on flat stone and fingers that stop working for the first hour. Gloves and a warm hat, not optional.`,
      'It freezes overnight too.',
      ['fleece', 'gloveshat']);
  }
  if (t <= 7) {
    return concern('cold', 1,
      `A cold start that warms up. ${t}° at dawn feels sharper than it sounds the moment you stand still. Take a layer you can shed by mid-morning.`,
      'It starts cold too.',
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
      `Stay low today. Gusts to ${g} km/h knock you off balance on open ground, and a ridge at that speed is dangerous rather than unpleasant. Valley routes, or leave it.`,
      'The wind is dangerous with it.',
      ['windshell']);
  }
  if (g >= 40) {
    return concern('wind', 2,
      `The wind is the story today. Gusts to ${g} km/h mean working against it on anything open, and it pulls heat out of you faster than the temperature suggests. Pick a sheltered line.`,
      'The wind will fight you too.',
      ['windshell']);
  }
  if (g >= 25) {
    return concern('wind', 1,
      `Breezy, and nothing beyond that. ${g} km/h gusts are noticeable crossing open ground and disappear the moment you are in trees. Worth a windproof, not worth changing route.`,
      'It is breezy with it.',
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
      `The sun is the hazard today. UV ${u} burns exposed skin in about ten minutes, and light coming back off rock or snow doubles what reaches you. Stay off open ground between eleven and four.`,
      'The sun is extreme with it.',
      ['sunhat', 'spf', 'sunsleeves', 'sunglasses']);
  }
  if (u >= 8) {
    return concern('uv', 2,
      `Strong sun the whole way through. At UV ${u} sunscreen on its own gives out after a few hours of sweating into it. Long sleeves, a brimmed hat, and top up at lunch.`,
      'The sun is strong with it.',
      ['sunhat', 'spf', 'sunsleeves', 'sunglasses']);
  }
  if (u >= 6) {
    return concern('uv', 1,
      `Bright, with real strength in it. UV ${u} catches the back of your neck and the tops of your ears long before you feel it happening. Hat on from the start.`,
      'The sun has strength in it too.',
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
    `Short day. ${hours.toFixed(1)} hours of usable light is less than it sounds once a slow start eats into it. Pick a route you can finish with an hour spare.`,
    'The light runs out early too.',
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
  const gust = round(d.gustMax ?? d.windMax ?? 0);
  const sun = round(d.uvMax ?? 0, 1);
  const light = daylightHours(d);
  const spread = hi - lo;
  const range = lo === hi ? `${lo}° all day` : `${lo}° to ${hi}°`;

  /*
    Most days on most trips land here, so one sentence repeated down the page
    would read as filler however well written it is. All three parts branch on
    conditions that are real but never bad enough to become a concern: a bit of
    breeze, moderate sun, a wide or narrow temperature swing, a long or short
    day. Two days read the same only when they genuinely are the same.

    The closing line is dropped when there is nothing useful to add, which
    leaves some days at two sentences and some at three. Uniform length is its
    own kind of tell.
  */
  const opener =
      hi >= 25 ? `Warm and settled. ${range}, dry the whole way through.`
    : hi >= 20 ? `A proper walking day. ${range}, dry, and the sort of range you stop noticing after an hour.`
    : hi >= 15 ? `About as good as it gets. ${range}, dry, and nothing in the sky worth watching.`
    : hi >= 9  ? `Cool and clear. ${range} is comfortable once you are moving, though you will feel it at stops.`
    :            `Cold but clean. ${range} and dry, which is better walking weather than it sounds.`;

  const middle =
      gust >= 15 && sun >= 4   ? ` Enough breeze to keep you cool, enough sun to be worth a hat.`
    : gust >= 15               ? ` A light breeze across open ground, nothing you will have to lean into.`
    : sun >= 4                 ? ` The sun has some presence without ever being a problem.`
    : spread >= 12             ? ` A wide swing between dawn and mid-afternoon, so take something you can shed.`
    : spread <= 4              ? ` Barely a few degrees in it from dawn to dusk, which makes packing simple.`
    : light !== null && light >= 12.5 ? ` ${light.toFixed(0)} hours of light, so distance is not the limiting factor.`
    : light !== null && light < 11     ? ` The light is short enough that a late start costs you real distance.`
    :                            ` Still air, and nothing much asked of you.`;

  const close =
      hi >= 25                       ? ` Keep water going in and go as far as you like.`
    : hi < 9                         ? ` Layer up at the start and enjoy having the hills to yourself.`
    : light !== null && light >= 13  ? ` Go as far as the legs hold out.`
    :                                  '';

  return opener + middle + close;
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
      return `Sun is hardest between ${clock(fierce[0])} and ${clock(fierce[fierce.length - 1] + 1)}.`;
    }
    return '';
  }

  const wetStart = wet[0];
  const wetEnd = wet[wet.length - 1];
  const morningOnly = wetEnd <= (first + last) / 2;
  const afternoonOnly = wetStart >= (first + last) / 2;
  const scattered = wet.length > 2 && (wetEnd - wetStart + 1) > wet.length + 1;

  if (scattered) return 'Showers come and go all day rather than settling into one band.';
  if (morningOnly) return `The rain clears around ${clock(wetEnd + 1)}, so there is a good afternoon in this if you start late.`;
  if (afternoonOnly) return `Dry until about ${clock(wetStart)}, then it turns. Get the distance done early.`;
  return `The worst of it sits between ${clock(wetStart)} and ${clock(wetEnd + 1)}.`;
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
    line = only === 3 ? 'One day, and it is best avoided. Move it if you can.'
         : only === 2 ? 'One day, and it will take some planning.'
         : 'One day, and you have picked a good one.';

  } else if (bad.length === n) {
    line = `Not a week for it. None of these ${n} days is worth a full day on foot.`;

  } else if (bad.length === 0 && tricky.length === 0) {
    line = `A good window for it. All ${n} days are walkable with nothing to plan around.`;

  } else if (bad.length === 0 && clear.length === 0) {
    line = `Every one of these ${n} days needs planning around. None is unusable, but none is straightforward either.`;

  } else if (bad.length === 0 && clear.length >= tricky.length) {
    line = `Mostly good. ${phrase(tricky, n, 'lead')} ${verb(tricky.length, 'needs', 'need')} planning around, and the rest you can take as they come.`;

  } else if (bad.length === 0) {
    line = `A demanding week. Only ${clear.length} of the ${n} days ${verb(clear.length, 'is', 'are')} straightforward, and ${phrase(tricky, n, 'rest')} ${verb(tricky.length, 'needs', 'need')} working around.`;

  } else {
    line = `${usable} of the ${n} days ${verb(usable, 'is', 'are')} worth having. ${capitalise(phrase(bad, n, 'rest'))} ${verb(bad.length, 'is', 'are')} best avoided.`;
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
    : ' Nothing more than a trace of rain on any day.';

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
