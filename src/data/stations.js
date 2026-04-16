export const DISTRICTS = [
  'Central',
  'Northern',
  'Eastern',
  'Southern 1',
  'Southern 2',
  'Western 1',
  'Western 2',
  'Western 3',
  'North & West Regional',
];

export const STATIONS = [
  // ── Central ────────────────────────────────────────────────────
  { id: 1,  name: 'Eastern Hill',        district: 'Central',              lat: -37.8080, lng: 144.9743 },
  { id: 2,  name: 'West Melbourne',      district: 'Central',              lat: -37.8073, lng: 144.9431 },
  { id: 3,  name: 'Carlton',             district: 'Central',              lat: -37.7997, lng: 144.9658 },
  { id: 4,  name: 'Brunswick',           district: 'Central',              lat: -37.7661, lng: 144.9619 },
  { id: 8,  name: 'Burnley Complex',     district: 'Central',              lat: -37.8286, lng: 145.0139 },
  { id: 10, name: 'Richmond',            district: 'Central',              lat: -37.8183, lng: 144.9994 },
  { id: 13, name: 'Northcote',           district: 'Central',              lat: -37.7706, lng: 145.0003 },
  { id: 18, name: 'Hawthorn',            district: 'Central',              lat: -37.8231, lng: 145.0333 },
  { id: 35, name: 'Windsor',             district: 'Central',              lat: -37.8583, lng: 144.9906 },
  { id: 38, name: 'South Melbourne',     district: 'Central',              lat: -37.8325, lng: 144.9583 },
  { id: 39, name: 'Port Melbourne',      district: 'Central',              lat: -37.8433, lng: 144.9344 },
  { id: 50, name: 'Ascot Vale',          district: 'Central',              lat: -37.7839, lng: 144.9181 },

  // ── Northern ───────────────────────────────────────────────────
  { id: 5,  name: 'Broadmeadows',        district: 'Northern',             lat: -37.6808, lng: 144.9136 },
  { id: 6,  name: 'Pascoe Vale',         district: 'Northern',             lat: -37.7239, lng: 144.9417 },
  { id: 7,  name: 'Thomastown',          district: 'Northern',             lat: -37.6864, lng: 145.0053 },
  { id: 9,  name: 'Somerton',            district: 'Northern',             lat: -37.6125, lng: 144.9486 },
  { id: 11, name: 'Epping',              district: 'Northern',             lat: -37.6467, lng: 145.0219 },
  { id: 12, name: 'Preston',             district: 'Northern',             lat: -37.7439, lng: 145.0072 },
  { id: 14, name: 'Bundoora',            district: 'Northern',             lat: -37.7025, lng: 145.0653 },
  { id: 15, name: 'Heidelberg',          district: 'Northern',             lat: -37.7550, lng: 145.0628 },
  { id: 16, name: 'Greensborough',       district: 'Northern',             lat: -37.7044, lng: 145.1011 },
  { id: 60, name: 'VEMTC',              district: 'Northern',             lat: -37.5928, lng: 144.9358 },
  { id: 80, name: 'Craigieburn',         district: 'Northern',             lat: -37.6011, lng: 144.9453 },
  { id: 81, name: 'South Morang',        district: 'Northern',             lat: -37.6481, lng: 145.1036 },

  // ── Eastern ────────────────────────────────────────────────────
  { id: 19, name: 'North Balwyn',        district: 'Eastern',              lat: -37.7942, lng: 145.0872 },
  { id: 20, name: 'Box Hill',            district: 'Eastern',              lat: -37.8194, lng: 145.1225 },
  { id: 22, name: 'Ringwood',            district: 'Eastern',              lat: -37.8156, lng: 145.2256 },
  { id: 23, name: 'Burwood',             district: 'Eastern',              lat: -37.8533, lng: 145.1183 },
  { id: 26, name: 'Croydon',             district: 'Eastern',              lat: -37.7964, lng: 145.2822 },
  { id: 27, name: 'Nunawading',          district: 'Eastern',              lat: -37.8181, lng: 145.1783 },
  { id: 28, name: 'Vermont South',       district: 'Eastern',              lat: -37.8636, lng: 145.1919 },
  { id: 30, name: 'Templestowe',         district: 'Eastern',              lat: -37.7567, lng: 145.1603 },
  { id: 82, name: 'Eltham City',         district: 'Eastern',              lat: -37.7131, lng: 145.1458 },
  { id: 84, name: 'South Warrandyte',    district: 'Eastern',              lat: -37.7525, lng: 145.2253 },
  { id: 85, name: 'Boronia',             district: 'Eastern',              lat: -37.8653, lng: 145.2889 },

  // ── Southern 1 ─────────────────────────────────────────────────
  { id: 24, name: 'Glen Iris (Malvern)', district: 'Southern 1',           lat: -37.8678, lng: 145.0467 },
  { id: 25, name: 'Oakleigh',            district: 'Southern 1',           lat: -37.8978, lng: 145.0906 },
  { id: 29, name: 'Clayton',             district: 'Southern 1',           lat: -37.9214, lng: 145.1183 },
  { id: 31, name: 'Glen Waverley',       district: 'Southern 1',           lat: -37.8778, lng: 145.1656 },
  { id: 32, name: 'Ormond',              district: 'Southern 1',           lat: -37.9058, lng: 145.0297 },
  { id: 33, name: 'Mentone',             district: 'Southern 1',           lat: -37.9817, lng: 145.0578 },
  { id: 34, name: 'Highett',             district: 'Southern 1',           lat: -37.9644, lng: 145.0481 },
  { id: 86, name: 'Rowville',            district: 'Southern 1',           lat: -37.9356, lng: 145.2200 },
  { id: 89, name: 'Springvale',          district: 'Southern 1',           lat: -37.9500, lng: 145.1522 },

  // ── Southern 2 ─────────────────────────────────────────────────
  { id: 87, name: 'Dandenong',           district: 'Southern 2',           lat: -37.9878, lng: 145.2153 },
  { id: 88, name: 'Hallam',              district: 'Southern 2',           lat: -38.0436, lng: 145.2572 },
  { id: 90, name: 'Patterson River',     district: 'Southern 2',           lat: -38.0847, lng: 145.1006 },
  { id: 91, name: 'Frankston',           district: 'Southern 2',           lat: -38.1478, lng: 145.1236 },
  { id: 92, name: 'Cranbourne',          district: 'Southern 2',           lat: -38.0983, lng: 145.2789 },
  { id: 93, name: 'Pakenham',            district: 'Southern 2',           lat: -38.0717, lng: 145.4886 },
  { id: 94, name: 'Mornington',          district: 'Southern 2',           lat: -38.2183, lng: 145.0367 },
  { id: 95, name: 'Rosebud',             district: 'Southern 2',           lat: -38.3594, lng: 144.9083 },

  // ── Western 1 ──────────────────────────────────────────────────
  { id: 40, name: 'Laverton',            district: 'Western 1',            lat: -37.8644, lng: 144.7989 },
  { id: 42, name: 'Newport',             district: 'Western 1',            lat: -37.8583, lng: 144.8889 },
  { id: 45, name: 'Brooklyn',            district: 'Western 1',            lat: -37.8319, lng: 144.8533 },
  { id: 46, name: 'Altona',              district: 'Western 1',            lat: -37.8692, lng: 144.8297 },
  { id: 47, name: 'Footscray',           district: 'Western 1',            lat: -37.8017, lng: 144.8994 },
  { id: 57, name: 'Tarneit',             district: 'Western 1',            lat: -37.8519, lng: 144.6969 },
  { id: 58, name: 'Point Cook',          district: 'Western 1',            lat: -37.9139, lng: 144.7456 },
  { id: 59, name: 'Derrimut',            district: 'Western 1',            lat: -37.8117, lng: 144.7692 },
  { id: 96, name: 'Derrimut RCRS',       district: 'Western 1',            lat: -37.8100, lng: 144.7675 },

  // ── Western 2 ──────────────────────────────────────────────────
  { id: 41, name: 'St Albans',           district: 'Western 2',            lat: -37.7492, lng: 144.8033 },
  { id: 43, name: 'Deer Park',           district: 'Western 2',            lat: -37.7786, lng: 144.7833 },
  { id: 44, name: 'Sunshine',            district: 'Western 2',            lat: -37.7875, lng: 144.8319 },
  { id: 48, name: "Taylor's Lakes",      district: 'Western 2',            lat: -37.7136, lng: 144.7928 },
  { id: 51, name: 'Keilor',              district: 'Western 2',            lat: -37.7283, lng: 144.8417 },
  { id: 52, name: 'Tullamarine',         district: 'Western 2',            lat: -37.7097, lng: 144.8756 },
  { id: 53, name: 'Sunbury',             district: 'Western 2',            lat: -37.5769, lng: 144.7261 },
  { id: 54, name: 'Greenvale',           district: 'Western 2',            lat: -37.6647, lng: 144.8769 },
  { id: 55, name: 'Caroline Springs',    district: 'Western 2',            lat: -37.7381, lng: 144.7386 },
  { id: 56, name: 'Melton',              district: 'Western 2',            lat: -37.6847, lng: 144.5786 },

  // ── Western 3 ──────────────────────────────────────────────────
  { id: 61, name: 'Lara',               district: 'Western 3',             lat: -38.0267, lng: 144.4014 },
  { id: 62, name: 'Corio',              district: 'Western 3',             lat: -38.0822, lng: 144.3533 },
  { id: 63, name: 'Geelong City',       district: 'Western 3',             lat: -38.1472, lng: 144.3614 },
  { id: 64, name: 'Belmont',            district: 'Western 3',             lat: -38.1853, lng: 144.3617 },
  { id: 66, name: 'Ocean Grove',        district: 'Western 3',             lat: -38.2653, lng: 144.5217 },

  // ── North & West Regional ──────────────────────────────────────
  { id: 67, name: 'Ballarat City',      district: 'North & West Regional', lat: -37.5622, lng: 143.8503 },
  { id: 68, name: 'Lucas',              district: 'North & West Regional', lat: -37.5297, lng: 143.8181 },
  { id: 70, name: 'Warrnambool',        district: 'North & West Regional', lat: -38.3828, lng: 142.4872 },
  { id: 71, name: 'Portland',           district: 'North & West Regional', lat: -38.3483, lng: 141.6042 },
  { id: 72, name: 'Mildura',            district: 'North & West Regional', lat: -34.1878, lng: 142.1600 },
  { id: 73, name: 'Bendigo',            district: 'North & West Regional', lat: -36.7569, lng: 144.2797 },
];

export function getStationById(id) {
  return STATIONS.find(s => s.id === id) || null;
}

export function getDistrictForStation(id) {
  const s = getStationById(id);
  return s ? s.district : null;
}

export function getStationsForDistrict(district) {
  return STATIONS.filter(s => s.district === district).sort((a, b) => a.id - b.id);
}
