/* ---------------------------------------------------------------------------
   Altitude.

   A forecast is for a point on the map, and that point is almost always the
   town. A hiker starts there and then spends the day well above it. Chamonix
   sits at 1,060m; the paths above it run to 2,400m and higher. Reading the
   valley forecast and walking the ridge is how people end up cold.

   So when you say how high you are going, every figure is re-derived for that
   height before any threshold sees it. The judgement does not change. It just
   stops being asked about the wrong place.

   WHAT IS ADJUSTED, AND ON WHAT AUTHORITY

   Temperature, by the environmental lapse rate of 6.5°C per 1,000m. This is
   the standard atmosphere figure. Real lapse rates vary between roughly 5 in
   saturated air and 9.8 in dry, so this is a middle estimate rather than a
   measurement, and it is applied to the feels-like figures as well as the raw
   ones.

   UV, by 10% per 1,000m. Less atmosphere overhead means more of it reaches
   you, and published estimates cluster between 8 and 12% per kilometre.

   WHAT IS NOT ADJUSTED, AND WHY NOT

   Wind. A ridge is far windier than the valley below it, but by how much
   depends on the shape of the ground, and no honest number can be derived
   from a single elevation figure. Inventing a multiplier would make the
   output look more precise while making it less true, so the app says plainly
   that the wind figure is a valley reading.

   Rain. Precipitation does increase with height, but whether it falls as rain
   or snow is the part that matters, and the freezing level answers that
   directly. It is fetched rather than estimated.
--------------------------------------------------------------------------- */

export const LAPSE_RATE = 6.5;    // °C lost per 1,000m climbed
export const UV_PER_KM = 0.10;    // UV index gained per 1,000m, as a fraction

/** Re-derive one day's figures for the height you will actually be walking at. */
export function adjustForAltitude(day, gain) {
  if (!gain || gain <= 0) return day;

  const drop = (gain / 1000) * LAPSE_RATE;
  const uvFactor = 1 + (gain / 1000) * UV_PER_KM;
  const cooler = v => (typeof v === 'number' ? v - drop : v);

  return {
    ...day,
    tempMax:  cooler(day.tempMax),
    tempMin:  cooler(day.tempMin),
    feelsMax: cooler(day.feelsMax),
    feelsMin: cooler(day.feelsMin),
    uvMax:    typeof day.uvMax === 'number' ? day.uvMax * uvFactor : day.uvMax,
    gain
  };
}

/**
 * The freezing level during daylight, averaged. Above this height water is
 * frozen, which decides whether the ground underfoot is wet or icy.
 */
export function freezingLevel(hoursForDay, sunriseStamp, sunsetStamp) {
  if (!Array.isArray(hoursForDay) || hoursForDay.length === 0) return null;

  const first = clockHour(sunriseStamp) ?? 7;
  const last = clockHour(sunsetStamp) ?? 19;

  const readings = hoursForDay
    .filter(h => h.hour >= first && h.hour <= last)
    .map(h => h.freezing)
    .filter(v => typeof v === 'number');

  if (readings.length === 0) return null;
  return readings.reduce((a, b) => a + b, 0) / readings.length;
}

/** How much colder the top is than the town, for the explanatory line. */
export function temperatureDrop(gain) {
  return (gain / 1000) * LAPSE_RATE;
}

function clockHour(stamp) {
  if (!stamp || !stamp.includes('T')) return null;
  return Number(stamp.split('T')[1].slice(0, 2));
}

export function metres(value) {
  return `${Math.round(value).toLocaleString('en-GB')}m`;
}
