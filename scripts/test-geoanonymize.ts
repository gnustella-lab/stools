import {anonymizeGeo, detectGeoFormat, precisionHint, shiftCoordinate} from '../src/lib/geoanonymize.ts';

let failures = 0;
function check(name: string, ok: boolean, detail = '') {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

const gpx = `<gpx><trk><trkseg>
  <trkpt lat="-23.550520" lon="-46.633308"><time>2024-01-01T12:00:00Z</time><ele>760.4</ele></trkpt>
</trkseg></trk></gpx>`;

check('detects GPX', detectGeoFormat(gpx) === 'gpx');

const rounded = anonymizeGeo(gpx, {
  decimalPlaces: 3,
  noiseMeters: 0,
  stripTime: true,
  stripElevation: false,
  stripMetadata: false,
});
check('GPX format', rounded.format === 'gpx', rounded.format);
check('one point counted', rounded.points === 1, String(rounded.points));
check('lat rounded to 3 places', rounded.output.includes('lat="-23.551"'), rounded.output);
check('lon rounded to 3 places', rounded.output.includes('lon="-46.633"'), rounded.output);
check('time stripped', !/<time\b/i.test(rounded.output), rounded.output);
check('elevation kept when not stripped', /<ele\b/i.test(rounded.output), rounded.output);

const stripped = anonymizeGeo(gpx, {
  decimalPlaces: 3,
  noiseMeters: 0,
  stripTime: true,
  stripElevation: true,
  stripMetadata: true,
});
check('elevation stripped', !/<ele\b/i.test(stripped.output), stripped.output);

const geojson = JSON.stringify({
  type: 'Feature',
  properties: {name: 'home', time: '2024-01-01T12:00:00Z'},
  geometry: {type: 'Point', coordinates: [-46.633308, -23.55052]},
});
check('detects GeoJSON', detectGeoFormat(geojson) === 'geojson');

const jsonOut = anonymizeGeo(geojson, {
  decimalPlaces: 3,
  noiseMeters: 0,
  stripTime: true,
  stripElevation: false,
  stripMetadata: true,
});
const parsed = JSON.parse(jsonOut.output) as {
  properties: Record<string, unknown>;
  geometry: {coordinates: number[]};
};
check('GeoJSON lon rounded', parsed.geometry.coordinates[0] === -46.633, String(parsed.geometry.coordinates[0]));
check('GeoJSON lat rounded', parsed.geometry.coordinates[1] === -23.551, String(parsed.geometry.coordinates[1]));
check('GeoJSON time stripped', parsed.properties.time === undefined);
check('GeoJSON name stripped', parsed.properties.name === undefined);

const [lat, lon] = shiftCoordinate(-23.55052, -46.633308, 0, 2);
check('shiftCoordinate rounding only', lat === -23.55 && lon === -46.63, `${lat},${lon}`);
check('precision hint for 3 places', precisionHint(3) === '~110 m', precisionHint(3));

try {
  anonymizeGeo('not a track');
  check('unknown format throws', false);
} catch {
  check('unknown format throws', true);
}

if (failures > 0) {
  console.error(`${failures} case(s) failed`);
  process.exit(1);
}
console.log('TODOS OS CASOS PASSARAM');
