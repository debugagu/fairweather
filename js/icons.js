/*
  Weather glyphs, drawn by hand as monochrome strokes.

  These are descriptive, not advisory. They tell you the shape of the day at a
  glance; they never touch the verdict. An overcast day still reads "about as
  good as walking weather gets", because cloud has almost nothing to do with
  whether a walk is worth taking. The icon is there because people orient by it,
  not because we let it into the judgement.

  Clouds are filled with the page colour rather than left hollow, so overlapping
  shapes occlude each other properly instead of showing their seams. Everything
  else strokes in currentColor, which means one set of paths works in both
  themes and inherits whatever colour the surrounding text is using.
*/

const CLOUD = 'M7 17.4a3.5 3.5 0 0 1 .35-6.85 5 5 0 0 1 9.35.6 3.2 3.2 0 0 1-.2 6.25Z';
const CLOUD_HIGH = 'M7 14.4a3.3 3.3 0 0 1 .35-6.5 4.8 4.8 0 0 1 8.95.57 3 3 0 0 1-.2 5.93Z';

const SUN_RAYS = [
  'M12 2.4v2.6', 'M12 19v2.6', 'M2.4 12h2.6', 'M19 12h2.6',
  'M5.4 5.4 7.25 7.25', 'M16.75 16.75 18.6 18.6',
  'M18.6 5.4 16.75 7.25', 'M7.25 16.75 5.4 18.6'
].map(d => `<path d="${d}"/>`).join('');

const SMALL_RAYS = [
  'M8.5 1.9v1.9', 'M2.6 7.8h1.9', 'M4.3 3.6 5.6 4.9', 'M12.7 3.6 11.4 4.9'
].map(d => `<path d="${d}"/>`).join('');

const GLYPHS = {
  clear: `<circle cx="12" cy="12" r="4"/>${SUN_RAYS}`,

  partly: `<circle cx="8.5" cy="7.8" r="3"/>${SMALL_RAYS}
           <path d="${CLOUD}" fill="var(--paper)"/>`,

  overcast: `<path d="M9.6 8.6a4.4 4.4 0 0 1 8.15.5 2.9 2.9 0 0 1 .05 5.6"/>
             <path d="${CLOUD}" fill="var(--paper)"/>`,

  fog: `<path d="${CLOUD_HIGH}" fill="var(--paper)"/>
        <path d="M5.5 17.4h13"/><path d="M7.5 20.3h9"/>`,

  rain: `<path d="${CLOUD_HIGH}" fill="var(--paper)"/>
         <path d="M8.6 16.6 7.4 19.8"/><path d="M12.6 16.6 11.4 20.6"/>
         <path d="M16.6 16.6 15.4 19.8"/>`,

  snow: `<path d="${CLOUD_HIGH}" fill="var(--paper)"/>
         <path d="M8 17.2v3"/><path d="M6.7 17.9 9.3 19.5"/><path d="M9.3 17.9 6.7 19.5"/>
         <path d="M15.4 17.2v3"/><path d="M14.1 17.9 16.7 19.5"/><path d="M16.7 17.9 14.1 19.5"/>`,

  storm: `<path d="${CLOUD_HIGH}" fill="var(--paper)"/>
          <path d="M13 15.4 9.6 19.2h3.1l-1.5 3.3" fill="none"/>`
};

const NAMES = {
  clear: 'Clear',
  partly: 'Partly cloudy',
  overcast: 'Overcast',
  fog: 'Fog',
  rain: 'Rain',
  snow: 'Snow',
  storm: 'Thunderstorm'
};

/*
  WMO codes, which is what Open-Meteo returns. Collapsed to seven buckets,
  because the distinction between "light drizzle" and "moderate drizzle" is not
  something a 20 pixel glyph can carry, and the verdict already said it in words.
*/
export function iconFor(code) {
  if (code === 0) return 'clear';
  if (code === 1 || code === 2) return 'partly';
  if (code === 3) return 'overcast';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 67) return 'rain';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 80 && code <= 82) return 'rain';
  if (code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  return 'overcast';
}

export function iconName(key) {
  return NAMES[key] || 'Unknown';
}

/*
  Built as a real SVG element rather than innerHTML on the day card, so nothing
  the API returns can ever be parsed as markup. The glyph paths are ours, the
  code that picks between them is the only thing the API influences.
*/
export function iconSvg(key) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.4');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = GLYPHS[key] || GLYPHS.overcast;
  return svg;
}
