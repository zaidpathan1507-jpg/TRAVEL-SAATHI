/**
 * Comprehensive image catalog for Anvesha experiences, landmarks, and destinations.
 * Sourced from verified authentic photography (Wikimedia Commons, official museum archives).
 */

export interface ExperienceImageData {
  id: string;
  url: string;
  remoteUrl: string;
  alt: string;
  title: string;
  location: string;
  category: string;
  source: string;
}

export const EXPERIENCE_IMAGES_MAP: Record<string, ExperienceImageData> = {
  // 1. Traditional Pune Food Walk
  'pune-food-walk': {
    id: 'pune-food-walk',
    url: '/images/experiences/pune-food-walk.jpg',
    remoteUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/94/Misal_Pav_from_Maharashtra.JPG',
    alt: 'Traditional authentic Maharashtrian Misal Pav served with pav, sprouts and spicy rassa in Pune',
    title: 'Traditional Pune Food Walk',
    location: 'Kasba & Budhwar Peth, Pune',
    category: 'food',
    source: 'Wikimedia Commons (CC-BY-SA 4.0)',
  },

  // 2. Shaniwar Wada Heritage Story Walk
  'shaniwar-wada-story': {
    id: 'shaniwar-wada-story',
    url: '/images/experiences/shaniwar-wada-story.jpg',
    remoteUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/6d/Shanwar_Wada_Delhi_darwaza.jpg',
    alt: 'The monumental Delhi Darwaza with defensive iron spikes at Shaniwar Wada fort in Pune',
    title: 'Shaniwar Wada Heritage Story Walk',
    location: 'Shaniwar Peth, Pune',
    category: 'history',
    source: 'Wikimedia Commons (CC-BY-SA 4.0)',
  },

  // 3. Indoor Pottery Workshop
  'mitti-pottery': {
    id: 'mitti-pottery',
    url: '/images/experiences/mitti-pottery.jpg',
    remoteUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d1/Potter_shaping_clay_on_a_traditional_manual_potter%E2%80%99s_wheel_in_India_01.jpg',
    alt: 'Artisan crafting a clay vessel on a potter wheel in an indoor pottery workshop',
    title: 'Indoor Pottery Workshop',
    location: 'Prabhat Road, Pune',
    category: 'art',
    source: 'Wikimedia Commons (CC-BY-SA 4.0)',
  },

  // 4. Mastani & Mithai Tasting Studio
  'peth-mithai-studio': {
    id: 'peth-mithai-studio',
    url: '/images/experiences/peth-mithai-studio.jpg',
    remoteUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Mango_Mastani_and_Mango_Ice-Cream.jpg',
    alt: 'Authentic Pune Mango Mastani thick milkshake topped with mango ice cream and dry fruits',
    title: 'Mastani & Mithai Tasting Studio',
    location: 'Sadashiv Peth, Pune',
    category: 'food',
    source: 'Wikimedia Commons (CC-BY-SA 4.0)',
  },

  // 5. Kasba Ganpati Temple Story Stop
  'kasba-ganpati': {
    id: 'kasba-ganpati',
    url: '/images/experiences/kasba-ganpati.jpg',
    remoteUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Kasba_Ganpati_Mandir_01.JPG',
    alt: 'Historic carved wooden entrance and courtyard of Kasba Ganpati Mandir in Kasba Peth, Pune',
    title: 'Kasba Ganpati Temple Story Stop',
    location: 'Kasba Peth, Pune',
    category: 'culture',
    source: 'Wikimedia Commons (CC-BY-SA 4.0)',
  },

  // 6. Dhol-Tasha Community Practice
  'dhol-tasha': {
    id: 'dhol-tasha',
    url: '/images/experiences/dhol-tasha.jpg',
    remoteUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/28/Dhol-tasha_pathak_getting_ready_in_Nutan_Marathi_Vidyalaya%2C_Pune.jpg',
    alt: 'Traditional Dhol Tasha troupe musicians preparing drums for community rehearsal in Pune',
    title: 'Dhol-Tasha Community Practice',
    location: 'Narayan Peth, Pune',
    category: 'music',
    source: 'Wikimedia Commons (CC-BY-SA 4.0)',
  },

  // 7. Tulshibaug Market Trail
  'tulshibaug-market': {
    id: 'tulshibaug-market',
    url: '/images/experiences/tulshibaug-market.jpg',
    remoteUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/68/Tulshibaug_shops_in_Pune.jpg',
    alt: 'Traditional brassware and colorful shopping stalls in the historic lanes of Tulshibaug, Pune',
    title: 'Tulshibaug Market Trail',
    location: 'Tulshibaug, Budhwar Peth, Pune',
    category: 'shopping',
    source: 'Wikimedia Commons (CC-BY-SA 4.0)',
  },

  // 8. Warli Art with a Tribal Artist
  'warli-workshop': {
    id: 'warli-workshop',
    url: '/images/experiences/warli-workshop.jpg',
    remoteUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a3/Warli_painting.jpg',
    alt: 'Authentic indigenous Warli folk art painting on clay-treated canvas showing Tarpa dance and village life',
    title: 'Warli Art with a Tribal Artist',
    location: 'Kothrud, Pune',
    category: 'art',
    source: 'Wikimedia Commons (CC-BY-SA 4.0)',
  },

  // 9. Evening Baithak: Natya Sangeet
  'natya-sangeet': {
    id: 'natya-sangeet',
    url: '/images/experiences/natya-sangeet.jpg',
    remoteUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/An_Indian_classical_music_performance.jpg',
    alt: 'Classical music baithak recital with vocalists accompanied by harmonium and tabla',
    title: 'Evening Baithak: Natya Sangeet',
    location: 'Sadashiv Peth, Pune',
    category: 'music',
    source: 'Wikimedia Commons (CC-BY-SA 4.0)',
  },

  // 10. Hidden Irani Café Trail
  'irani-cafe-trail': {
    id: 'irani-cafe-trail',
    url: '/images/experiences/irani-cafe-trail.jpg',
    remoteUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/11/Chai_bun_maska-Irani_cafe-pune%2CMaharashtra-008.jpg',
    alt: 'Traditional Irani chai served with warm buttered bun maska at an iconic café in Pune',
    title: 'Hidden Irani Café Trail',
    location: 'Camp, Pune',
    category: 'food',
    source: 'Wikimedia Commons (CC-BY-SA 4.0)',
  },

  // 11. Vetal Tekdi Nature Trail
  'vetal-tekdi': {
    id: 'vetal-tekdi',
    url: '/images/experiences/vetal-tekdi.jpg',
    remoteUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5b/Vetal_tekdi.jpg',
    alt: 'Green hillside nature trail and panoramic skyline view of Pune from Vetal Tekdi',
    title: 'Vetal Tekdi Nature Trail',
    location: 'Vetal Hill, Pune',
    category: 'nature',
    source: 'Wikimedia Commons (CC-BY-SA 4.0)',
  },

  // 12. Parvati Hill Sunset Climb
  'parvati-sunset': {
    id: 'parvati-sunset',
    url: '/images/experiences/parvati-sunset.jpg',
    remoteUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/26/Shikhara_of_temples_on_Parvati_Hill%2C_Pune_%285%29.jpg',
    alt: 'Peshwa-era temple spires on Parvati Hill complex overlooking the Pune city valley',
    title: 'Parvati Hill Sunset Climb',
    location: 'Parvati, Pune',
    category: 'history',
    source: 'Wikimedia Commons (CC-BY-SA 4.0)',
  },

  // 13. Aga Khan Palace Freedom Story
  'aga-khan-freedom': {
    id: 'aga-khan-freedom',
    url: '/images/experiences/aga-khan-freedom.jpg',
    remoteUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Aga_Khan_Palace_Pune_Preeti-Parashar_03.JPG',
    alt: 'Majestic Italianate arches and manicured heritage gardens of Aga Khan Palace in Pune',
    title: 'Aga Khan Palace Freedom Story',
    location: 'Kalyani Nagar, Pune',
    category: 'history',
    source: 'Wikimedia Commons (CC-BY-SA 4.0)',
  },

  // 14. Koregaon Park Live Music Night
  'kp-live-music': {
    id: 'kp-live-music',
    url: '/images/experiences/kp-live-music.jpg',
    remoteUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Sofia_Talvik_at_Acoustic_Music_San_Diego_%28AMSD%29_Live_Music_-_3_March_2010.jpg',
    alt: 'Intimate acoustic live music gig and singer-songwriter performance on an ambient lounge stage',
    title: 'Koregaon Park Live Music Night',
    location: 'Koregaon Park, Pune',
    category: 'nightlife',
    source: 'Wikimedia Commons (CC-BY-SA 4.0)',
  },

  // 15. Miniature Railway Museum Visit
  'miniature-railway': {
    id: 'miniature-railway',
    url: '/images/experiences/miniature-railway.jpg',
    remoteUrl: 'https://minirailways.com/wp-content/uploads/2023/11/Pune1-1.jpg',
    alt: 'Intricate operating scale model train layout and miniature city at Joshi Museum in Pune',
    title: 'Miniature Railway Museum Visit',
    location: 'Kothrud, Pune',
    category: 'family',
    source: "Joshi's Museum of Miniature Railways (Official Website Archive)",
  },

  // 16. Paithani Weaving Demo
  'paithani-weaving': {
    id: 'paithani-weaving',
    url: '/images/experiences/paithani-weaving.jpg',
    remoteUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/At_Paithani_Silk_Weaving_Center_%2850751073431%29.jpg',
    alt: 'Master artisan hand-weaving a royal Paithani silk saree with zari peacock motifs on a wooden loom',
    title: 'Paithani Weaving Demo',
    location: 'Budhwar Peth, Pune',
    category: 'shopping',
    source: 'Wikimedia Commons (CC-BY-SA 4.0)',
  },

  // Mumbai places
  'TS-MUM-001': {
    id: 'TS-MUM-001',
    url: '/images/experiences/colaba-causeway.jpg',
    remoteUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Colaba_Causeway%2CMumbai_-_panoramio.jpg',
    alt: 'Lively shopping stalls and sidewalk vendors on Colaba Causeway street market, Mumbai',
    title: 'Colaba Causeway Market',
    location: 'Colaba, Mumbai',
    category: 'shopping',
    source: 'Wikimedia Commons (CC-BY-SA 4.0)',
  },
  'TS-MUM-002': {
    id: 'TS-MUM-002',
    url: '/images/experiences/crawford-market.jpg',
    remoteUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/69/Crawford_Market_03.jpg',
    alt: 'Victorian Gothic clock tower and heritage stone facade of Crawford Market in Mumbai',
    title: 'Crawford Market (Mahatma Jyotiba Phule Mandai)',
    location: 'Fort, Mumbai',
    category: 'shopping',
    source: 'Wikimedia Commons (CC-BY-SA 4.0)',
  },
  'TS-MUM-003': {
    id: 'TS-MUM-003',
    url: '/images/experiences/chor-bazaar.jpg',
    remoteUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chor_Bazaar%2C_Mutton_Street%2C_Mumbai_%2824594093319%29.jpg',
    alt: 'Vintage antiques, colonial artifacts, and curios on Mutton Street in Chor Bazaar, Mumbai',
    title: 'Chor Bazaar',
    location: 'Kumbharwada, Mumbai',
    category: 'shopping',
    source: 'Wikimedia Commons (CC-BY-SA 4.0)',
  },
  'TS-MUM-004': {
    id: 'TS-MUM-004',
    url: '/images/experiences/kala-ghoda.jpg',
    remoteUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/14/Kala_Ghoda_pottery_%28Unsplash%29.jpg',
    alt: 'Artisan craft exhibits and heritage architecture in the Kala Ghoda Arts Precinct, Mumbai',
    title: 'Kala Ghoda Art District & Handicraft Boutiques',
    location: 'Kala Ghoda, Fort, Mumbai',
    category: 'art',
    source: 'Wikimedia Commons (CC-BY-SA 4.0)',
  },
  'TS-MUM-005': {
    id: 'TS-MUM-005',
    url: '/images/experiences/gateway-of-india.jpg',
    remoteUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Mumbai_03-2016_30_Gateway_of_India.jpg',
    alt: 'The grand Indo-Saracenic arch of Gateway of India overlooking Mumbai Harbour at Apollo Bunder',
    title: 'Gateway of India',
    location: 'Apollo Bunder, Mumbai',
    category: 'history',
    source: 'Wikimedia Commons (CC-BY-SA 4.0)',
  },
  'TS-MUM-006': {
    id: 'TS-MUM-006',
    url: '/images/experiences/leopold-cafe.jpg',
    remoteUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d6/Leopold_cafe_mumbai.jpg',
    alt: 'Historic facade and bustling dining room of Leopold Cafe on Colaba Causeway, Mumbai',
    title: 'Leopold Cafe & Bar',
    location: 'Colaba, Mumbai',
    category: 'food',
    source: 'Wikimedia Commons (CC-BY-SA 4.0)',
  },
  'TS-MUM-007': {
    id: 'TS-MUM-007',
    url: '/images/experiences/cafe-mondegar.jpg',
    remoteUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Cafe_Mondegar.JPG',
    alt: 'Vibrant Mario Miranda cartoon murals on the walls inside iconic Cafe Mondegar in Mumbai',
    title: 'Cafe Mondegar',
    location: 'Colaba, Mumbai',
    category: 'food',
    source: 'Wikimedia Commons (CC-BY-SA 4.0)',
  },
  'TS-MUM-008': {
    id: 'TS-MUM-008',
    url: '/images/experiences/mohammed-ali-road.jpg',
    remoteUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Kebabchi_%284976530644%29.jpg',
    alt: 'Street food stall master grilling spicy kebabs and delicacies on Mohammed Ali Road, Mumbai',
    title: 'Mohammed Ali Road Street Food Area',
    location: 'Mohammed Ali Road, Mumbai',
    category: 'food',
    source: 'Wikimedia Commons (CC-BY-SA 4.0)',
  },
  'TS-MUM-009': {
    id: 'TS-MUM-009',
    url: '/images/experiences/marine-drive.jpg',
    remoteUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0e/Mumbai_03-2016_46_evening_at_Marine_Drive.jpg',
    alt: "The Queen's Necklace sea-facing promenade and skyline along Marine Drive at dusk in Mumbai",
    title: 'Marine Drive Promenade',
    location: 'Marine Drive, Mumbai',
    category: 'nature',
    source: 'Wikimedia Commons (CC-BY-SA 4.0)',
  },

  // City & Landmark Visuals (for Profile, Home, and Search)
  'city-pune': {
    id: 'city-pune',
    url: '/images/experiences/pune-city.jpg',
    remoteUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Entrance_of_Shaniwar_Wada%2C_Pune.jpg',
    alt: 'Pune heritage landmark Shaniwar Wada with garden fountains and historic bastion',
    title: 'Pune Heritage & City',
    location: 'Pune',
    category: 'culture',
    source: 'Wikimedia Commons (CC-BY-SA 4.0)',
  },
  'city-jaipur': {
    id: 'city-jaipur',
    url: '/images/experiences/jaipur.jpg',
    remoteUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/37/Hawa_Mahal_2011.jpg',
    alt: 'The honeycomb windows and pink sandstone facade of Hawa Mahal in Jaipur, Rajasthan',
    title: 'Jaipur Heritage & Palaces',
    location: 'Jaipur, Rajasthan',
    category: 'culture',
    source: 'Wikimedia Commons (CC-BY-SA 4.0)',
  },
  'city-kochi': {
    id: 'city-kochi',
    url: '/images/experiences/kochi.jpg',
    remoteUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f2/Chinese_Fishing_Nets_-_3.jpg',
    alt: 'Traditional cantilevered Chinese fishing nets over the water in Fort Kochi, Kerala',
    title: 'Fort Kochi Coast & Heritage',
    location: 'Kochi, Kerala',
    category: 'culture',
    source: 'Wikimedia Commons (CC-BY-SA 4.0)',
  },
  'mahatma-phule-mandai': {
    id: 'mahatma-phule-mandai',
    url: '/images/experiences/mahatma-phule-mandai.jpg',
    remoteUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Building_of_Mahatma_Phule_Mandai%2C_Pune.jpg',
    alt: 'Historic octagonal central tower and market building of Mahatma Phule Mandai in Pune',
    title: 'Mahatma Phule Mandai',
    location: 'Shukrawar Peth, Pune',
    category: 'shopping',
    source: 'Wikimedia Commons (CC-BY-SA 4.0)',
  },
};

/**
 * Standard simple ID -> image URL map for direct lookups
 */
export const experienceImages: Record<string, string> = Object.fromEntries(
  Object.entries(EXPERIENCE_IMAGES_MAP).map(([key, item]) => [key, item.url])
);

/**
 * Normalizes an identifier or text string to match against the image catalog.
 */
function normalizeQuery(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Finds the most authentic verified image and alt text for an experience or location query.
 */
export function getExperienceImage(
  idOrTitle?: string,
  fallbackAlt?: string
): { src: string; alt: string; source?: string } | null {
  if (!idOrTitle) return null;

  // 1. Direct ID match
  const rawId = idOrTitle.startsWith('db:') ? idOrTitle.slice(3) : idOrTitle;
  if (EXPERIENCE_IMAGES_MAP[rawId]) {
    const item = EXPERIENCE_IMAGES_MAP[rawId];
    return { src: item.url, alt: item.alt, source: item.source };
  }

  // 2. Normalized slug match
  const query = normalizeQuery(idOrTitle);
  for (const [key, item] of Object.entries(EXPERIENCE_IMAGES_MAP)) {
    if (normalizeQuery(key) === query) {
      return { src: item.url, alt: item.alt, source: item.source };
    }
  }

  // 3. Keyword / semantic matching
  const rules: { keywords: string[]; targetId: string }[] = [
    { keywords: ['foodwalk', 'punefood', 'misalpav', 'streetfood'], targetId: 'pune-food-walk' },
    { keywords: ['shaniwar', 'wada', 'peshwa', 'delhidarwaza'], targetId: 'shaniwar-wada-story' },
    { keywords: ['pottery', 'clay', 'wheel', 'kumbharwada', 'mitti'], targetId: 'mitti-pottery' },
    { keywords: ['mastani', 'mithai', 'modak', 'sweet', 'sujata'], targetId: 'peth-mithai-studio' },
    { keywords: ['kasba', 'ganpati', 'ganesh', 'jijabai'], targetId: 'kasba-ganpati' },
    { keywords: ['dhol', 'tasha', 'pathak', 'shivgarjana', 'drum'], targetId: 'dhol-tasha' },
    { keywords: ['tulshibaug', 'tulshibaugmarket', 'tulsibaug'], targetId: 'tulshibaug-market' },
    { keywords: ['warli', 'tribalart', 'tarpa'], targetId: 'warli-workshop' },
    { keywords: ['natya', 'sangeet', 'baithak', 'harmonium', 'tabla'], targetId: 'natya-sangeet' },
    { keywords: ['irani', 'iranicafe', 'bunmaska', 'vohuman', 'goodluck'], targetId: 'irani-cafe-trail' },
    { keywords: ['vetal', 'tekdi', 'arai'], targetId: 'vetal-tekdi' },
    { keywords: ['parvati', 'parvatihill', 'paytha'], targetId: 'parvati-sunset' },
    { keywords: ['agakhan', 'aga', 'khan', 'kasturba'], targetId: 'aga-khan-freedom' },
    { keywords: ['koregaon', 'kp', 'livemusic', 'acoustic'], targetId: 'kp-live-music' },
    { keywords: ['railway', 'miniature', 'joshi', 'modeltrain'], targetId: 'miniature-railway' },
    { keywords: ['paithani', 'weaving', 'weaver', 'handloom', 'saree'], targetId: 'paithani-weaving' },
    { keywords: ['crawford', 'phulemandai', 'mandai'], targetId: 'TS-MUM-002' },
    { keywords: ['causeway', 'colaba'], targetId: 'TS-MUM-001' },
    { keywords: ['chorbazaar', 'chor'], targetId: 'TS-MUM-003' },
    { keywords: ['kalaghoda'], targetId: 'TS-MUM-004' },
    { keywords: ['gatewayofindia', 'gateway'], targetId: 'TS-MUM-005' },
    { keywords: ['leopold'], targetId: 'TS-MUM-006' },
    { keywords: ['mondegar'], targetId: 'TS-MUM-007' },
    { keywords: ['mohammedali', 'kebabs'], targetId: 'TS-MUM-008' },
    { keywords: ['marinedrive', 'queensnecklace'], targetId: 'TS-MUM-009' },
    { keywords: ['jaipur', 'hawamahal'], targetId: 'city-jaipur' },
    { keywords: ['kochi', 'cochin', 'chinesenets'], targetId: 'city-kochi' },
    { keywords: ['pune'], targetId: 'city-pune' },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((k) => query.includes(k))) {
      const item = EXPERIENCE_IMAGES_MAP[rule.targetId];
      if (item) {
        return { src: item.url, alt: fallbackAlt || item.alt, source: item.source };
      }
    }
  }

  return null;
}
