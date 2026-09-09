/* ---------------------------------------------------------------------------
   Open-Meteo, called live from the browser on every search.

   Two endpoints, neither needs a key. Both are wrapped so that a failure comes
   back as a sentence we can put on the screen rather than an exception.
--------------------------------------------------------------------------- */

const GEOCODE = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST = 'https://api.open-meteo.com/v1/forecast';

const TIMEOUT_MS = 9000;

/** An error carrying wording that is safe to show the user. */
export class ApiError extends Error {
  constructor(title, detail) {
    super(title);
    this.title = title;
    this.detail = detail;
  }
}

async function getJson(url) {
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, { signal: stop.signal });
  } catch (err) {
    throw new ApiError(
      navigator.onLine ? 'The weather service did not answer.' : 'You appear to be offline.',
      navigator.onLine
        ? 'Open-Meteo took too long or refused the request. It is usually back within a minute.'
        : 'Fairweather reads the forecast live, so it needs a connection. Reconnect and try again.'
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new ApiError(
      'The weather service returned an error.',
      `Open-Meteo answered with ${response.status}. If this keeps happening the service is probably having a moment.`
    );
  }

  try {
    return await response.json();
  } catch {
    throw new ApiError(
      'The forecast came back unreadable.',
      'The response was not valid data. Try the search again.'
    );
  }
}

/* Step 1: city name to coordinates ----------------------------------------- */

/**
 * Returns every plausible match, up to five. Deliberately does not choose.
 * Ten places are called Springfield; picking one for the user is a decision we
 * are not entitled to make.
 */
export async function findPlaces(name) {
  const query = new URLSearchParams({
    name: name.trim(),
    count: '5',
    language: 'en',
    format: 'json'
  });

  const data = await getJson(`${GEOCODE}?${query}`);
  const results = Array.isArray(data.results) ? data.results : [];

  return results.map(place => ({
    id: place.id,
    name: place.name,
    region: place.admin1 || '',
    country: place.country || '',
    countryCode: place.country_code || '',
    latitude: place.latitude,
    longitude: place.longitude,
    population: place.population || 0,
    label: [place.name, place.admin1, place.country].filter(Boolean).join(', ')
  }));
}

/* Step 2: coordinates and dates to a forecast ------------------------------ */

const DAILY = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'apparent_temperature_max',
  'apparent_temperature_min',
  'precipitation_probability_max',
  'precipitation_sum',
  'uv_index_max',
  'wind_speed_10m_max',
  'wind_gusts_10m_max',
  'sunrise',
  'sunset'
].join(',');

// Hourly is only here to answer "when in the day", which is the difference
// between "it will rain" and "go out after two".
const HOURLY = ['precipitation_probability', 'uv_index'].join(',');

export async function fetchForecast(place, startDate, endDate) {
  const query = new URLSearchParams({
    latitude: place.latitude,
    longitude: place.longitude,
    daily: DAILY,
    hourly: HOURLY,
    timezone: 'auto',
    start_date: startDate,
    end_date: endDate
  });

  const data = await getJson(`${FORECAST}?${query}`);

  if (data.error) {
    throw new ApiError(
      'Those dates were refused.',
      data.reason || 'Open-Meteo would not forecast that range. Try a window closer to today.'
    );
  }

  const daily = data.daily;
  if (!daily || !Array.isArray(daily.time) || daily.time.length === 0) {
    throw new ApiError(
      'No forecast came back for those dates.',
      'Open-Meteo had nothing for that window. Try dates closer to today.'
    );
  }

  return {
    timezone: data.timezone,
    days: daily.time.map((date, i) => ({
      date,
      code:         daily.weather_code?.[i],
      tempMax:      daily.temperature_2m_max?.[i],
      tempMin:      daily.temperature_2m_min?.[i],
      feelsMax:     daily.apparent_temperature_max?.[i],
      feelsMin:     daily.apparent_temperature_min?.[i],
      rainChance:   daily.precipitation_probability_max?.[i],
      rainTotal:    daily.precipitation_sum?.[i],
      uvMax:        daily.uv_index_max?.[i],
      windMax:      daily.wind_speed_10m_max?.[i],
      gustMax:      daily.wind_gusts_10m_max?.[i],
      sunrise:      daily.sunrise?.[i],
      sunset:       daily.sunset?.[i]
    })),
    hourly: shapeHourly(data.hourly)
  };
}

/** Group the flat hourly arrays by calendar day, so a day can look up its own. */
function shapeHourly(hourly) {
  const byDate = new Map();
  if (!hourly || !Array.isArray(hourly.time)) return byDate;

  hourly.time.forEach((stamp, i) => {
    const [date, clock] = stamp.split('T');
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push({
      hour: Number(clock.slice(0, 2)),
      rainChance: hourly.precipitation_probability?.[i] ?? null,
      uv: hourly.uv_index?.[i] ?? null
    });
  });

  return byDate;
}
