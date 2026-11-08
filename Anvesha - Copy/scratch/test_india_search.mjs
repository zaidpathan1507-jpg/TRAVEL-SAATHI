import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const places = JSON.parse(
  readFileSync(
    'C:/Users/samru/Downloads/AnveshaWinner/Anvesha/frontend/src/data/india-places.json',
    'utf-8'
  )
);

function searchLocalIndiaPlaces(query, maxResults = 8) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const scored = [];

  for (const place of places) {
    const nameLower = place.name.toLowerCase();
    const cityLower = place.city.toLowerCase();
    const stateLower = place.state.toLowerCase();
    const catLower = place.category.toLowerCase();
    const descLower = (place.description || '').toLowerCase();
    const keywords = (place.keywords || []).map((k) => k.toLowerCase());
    const aliases = (place.aliases || []).map((a) => a.toLowerCase());

    let score = 0;

    if (nameLower === q) score += 100;
    else if (cityLower === q) score += 80;
    else if (stateLower === q) score += 70;

    if (nameLower.startsWith(q)) score += 50;
    else if (cityLower.startsWith(q)) score += 40;

    if (nameLower.includes(q)) score += 30;
    if (keywords.some((k) => k === q || k.includes(q))) score += 35;
    if (aliases.some((a) => a.includes(q))) score += 30;
    if (cityLower.includes(q)) score += 20;
    if (stateLower.includes(q)) score += 15;
    if (catLower.includes(q)) score += 20;
    if (descLower.includes(q)) score += 10;

    const allTokensMatch = tokens.every(
      (t) =>
        nameLower.includes(t) ||
        cityLower.includes(t) ||
        stateLower.includes(t) ||
        catLower.includes(t) ||
        keywords.some((k) => k.includes(t)) ||
        aliases.some((a) => a.includes(t))
    );

    if (allTokensMatch && tokens.length > 1) {
      score += 45;
    }

    if (score > 0) {
      scored.push({ place, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxResults).map((s) => s.place);
}

const testQueries = [
  'Pune',
  'Mumbai',
  'Goa',
  'Delhi',
  'Jaipur',
  'Bengaluru',
  'Hyderabad',
  'Kolkata',
  'Chennai',
  'Manali',
  'Ladakh',
  'Agra',
  'Varanasi',
  'Shaniwar Wada',
  'Kasba Ganpati',
  'Taj Mahal',
  'Gateway of India',
  'Marine Drive',
  'Hawa Mahal',
  'India Gate',
  'Charminar',
  'Golden Temple',
  'Mysore Palace',
  'Misal Pav Pune',
  'street food Mumbai',
  'cafes in Pune',
  'beaches in Goa',
  'forts near Pune',
  'temples in Varanasi',
  'heritage places Jaipur',
];

console.log(`Testing ${testQueries.length} test search queries on local India dataset (${places.length} places):`);
let passCount = 0;
for (const q of testQueries) {
  const matches = searchLocalIndiaPlaces(q);
  if (matches.length > 0) {
    const top = matches[0];
    console.log(`✓ "${q}" -> [${top.category}] ${top.name} (${top.city}, ${top.state}) @ ${top.latitude}, ${top.longitude}`);
    passCount++;
  } else {
    console.error(`✗ "${q}" -> NO MATCH`);
  }
}

console.log(`\nResult: ${passCount}/${testQueries.length} test queries matched successfully.`);
if (passCount === testQueries.length) {
  console.log('ALL SEARCH MATCHES VERIFIED!');
} else {
  process.exit(1);
}
