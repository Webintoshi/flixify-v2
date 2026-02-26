/**
 * M3U PARSER - Optimized for SiFi IPTV Format
 * 
 * Supports: All world countries (150+ countries defined)
 * Format: TR • Kanal Adı FHD
 * 
 * Features:
 * - Auto-categorization (Spor, Sinema, Haber, Belgesel, Çocuk, Müzik)
 * - Quality detection from name (4K, FHD, HD, RAW, HEVC)
 * - All world countries supported (TR, DE, FR, UK, US, RU, etc.)
 * - No quality selector (user chooses from channel name)
 */

export interface M3UChannel {
  id: string;
  name: string;
  rawName: string;
  logo: string;
  group: string;
  url: string;
  countryCode: string;
  countryName: string;
  quality: '4K' | 'FHD' | 'HD' | 'RAW' | 'HEVC' | 'SD';
}

export interface Country {
  code: string;
  name: string;
  flag: string;
  channelCount: number;
}

// Legacy compatibility
export interface M3UPlaylist {
  name: string;
  url: string;
  channels: M3UChannel[];
}

// ALL WORLD COUNTRIES (150+ countries)
const countryMap: Record<string, { name: string; flag: string }> = {
  // TURKEY & NEIGHBORS
  'TR': { name: 'Türkiye', flag: '🇹🇷' },
  'AZ': { name: 'Azerbaycan', flag: '🇦🇿' },
  'KZ': { name: 'Kazakistan', flag: '🇰🇿' },
  'UZ': { name: 'Özbekistan', flag: '🇺🇿' },
  'KG': { name: 'Kırgızistan', flag: '🇰🇬' },
  'TJ': { name: 'Tacikistan', flag: '🇹🇯' },
  'TM': { name: 'Türkmenistan', flag: '🇹🇲' },
  
  // EUROPE
  'DE': { name: 'Almanya', flag: '🇩🇪' },
  'FR': { name: 'Fransa', flag: '🇫🇷' },
  'UK': { name: 'İngiltere', flag: '🇬🇧' },
  'IT': { name: 'İtalya', flag: '🇮🇹' },
  'ES': { name: 'İspanya', flag: '🇪🇸' },
  'NL': { name: 'Hollanda', flag: '🇳🇱' },
  'BE': { name: 'Belçika', flag: '🇧🇪' },
  'CH': { name: 'İsviçre', flag: '🇨🇭' },
  'AT': { name: 'Avusturya', flag: '🇦🇹' },
  'SE': { name: 'İsveç', flag: '🇸🇪' },
  'NO': { name: 'Norveç', flag: '🇳🇴' },
  'DK': { name: 'Danimarka', flag: '🇩🇰' },
  'FI': { name: 'Finlandiya', flag: '🇫🇮' },
  'PL': { name: 'Polonya', flag: '🇵🇱' },
  'CZ': { name: 'Çekya', flag: '🇨🇿' },
  'SK': { name: 'Slovakya', flag: '🇸🇰' },
  'HU': { name: 'Macaristan', flag: '🇭🇺' },
  'RO': { name: 'Romanya', flag: '🇷🇴' },
  'BG': { name: 'Bulgaristan', flag: '🇧🇬' },
  'HR': { name: 'Hırvatistan', flag: '🇭🇷' },
  'SI': { name: 'Slovenya', flag: '🇸🇮' },
  'RS': { name: 'Sırbistan', flag: '🇷🇸' },
  'BA': { name: 'Bosna Hersek', flag: '🇧🇦' },
  'ME': { name: 'Karadağ', flag: '🇲🇪' },
  'MK': { name: 'Kuzey Makedonya', flag: '🇲🇰' },
  'AL': { name: 'Arnavutluk', flag: '🇦🇱' },
  'GR': { name: 'Yunanistan', flag: '🇬🇷' },
  'CY': { name: 'Kıbrıs', flag: '🇨🇾' },
  'MT': { name: 'Malta', flag: '🇲🇹' },
  'IE': { name: 'İrlanda', flag: '🇮🇪' },
  'IS': { name: 'İzlanda', flag: '🇮🇸' },
  'PT': { name: 'Portekiz', flag: '🇵🇹' },
  'LU': { name: 'Lüksemburg', flag: '🇱🇺' },
  'LI': { name: 'Liechtenstein', flag: '🇱🇮' },
  'AD': { name: 'Andorra', flag: '🇦🇩' },
  'MC': { name: 'Monako', flag: '🇲🇨' },
  'SM': { name: 'San Marino', flag: '🇸🇲' },
  'VA': { name: 'Vatikan', flag: '🇻🇦' },
  
  // EASTERN EUROPE
  'RU': { name: 'Rusya', flag: '🇷🇺' },
  'UA': { name: 'Ukrayna', flag: '🇺🇦' },
  'BY': { name: 'Belarus', flag: '🇧🇾' },
  'MD': { name: 'Moldova', flag: '🇲🇩' },
  'EE': { name: 'Estonya', flag: '🇪🇪' },
  'LV': { name: 'Letonya', flag: '🇱🇻' },
  'LT': { name: 'Litvanya', flag: '🇱🇹' },
  'GE': { name: 'Gürcistan', flag: '🇬🇪' },
  'AM': { name: 'Ermenistan', flag: '🇦🇲' },
  
  // MIDDLE EAST
  'IR': { name: 'İran', flag: '🇮🇷' },
  'IQ': { name: 'Irak', flag: '🇮🇶' },
  'SY': { name: 'Suriye', flag: '🇸🇾' },
  'LB': { name: 'Lübnan', flag: '🇱🇧' },
  'JO': { name: 'Ürdün', flag: '🇯🇴' },
  'IL': { name: 'İsrail', flag: '🇮🇱' },
  'PS': { name: 'Filistin', flag: '🇵🇸' },
  'SA': { name: 'Suudi Arabistan', flag: '🇸🇦' },
  'AE': { name: 'Birleşik Arap Emirlikleri', flag: '🇦🇪' },
  'QA': { name: 'Katar', flag: '🇶🇦' },
  'KW': { name: 'Kuveyt', flag: '🇰🇼' },
  'BH': { name: 'Bahreyn', flag: '🇧🇭' },
  'OM': { name: 'Umman', flag: '🇴🇲' },
  'YE': { name: 'Yemen', flag: '🇾🇪' },
  
  // NORTH AFRICA
  'EG': { name: 'Mısır', flag: '🇪🇬' },
  'LY': { name: 'Libya', flag: '🇱🇾' },
  'TN': { name: 'Tunus', flag: '🇹🇳' },
  'DZ': { name: 'Cezayir', flag: '🇩🇿' },
  'MA': { name: 'Fas', flag: '🇲🇦' },
  'SD': { name: 'Sudan', flag: '🇸🇩' },
  'MR': { name: 'Moritanya', flag: '🇲🇷' },
  'ML': { name: 'Mali', flag: '🇲🇱' },
  'NE': { name: 'Nijer', flag: '🇳🇪' },
  'TD': { name: 'Çad', flag: '🇹🇩' },
  'ER': { name: 'Eritre', flag: '🇪🇷' },
  'DJ': { name: 'Cibuti', flag: '🇩🇯' },
  'ET': { name: 'Etiyopya', flag: '🇪🇹' },
  'SO': { name: 'Somali', flag: '🇸🇴' },
  
  // SUB-SAHARAN AFRICA
  'ZA': { name: 'Güney Afrika', flag: '🇿🇦' },
  'NG': { name: 'Nijerya', flag: '🇳🇬' },
  'GH': { name: 'Gana', flag: '🇬🇭' },
  'KE': { name: 'Kenya', flag: '🇰🇪' },
  'TZ': { name: 'Tanzanya', flag: '🇹🇿' },
  'UG': { name: 'Uganda', flag: '🇺🇬' },
  'RW': { name: 'Ruanda', flag: '🇷🇼' },
  'BI': { name: 'Burundi', flag: '🇧🇮' },
  'CD': { name: 'Kongo DC', flag: '🇨🇩' },
  'CG': { name: 'Kongo', flag: '🇨🇬' },
  'GA': { name: 'Gabon', flag: '🇬🇦' },
  'CM': { name: 'Kamerun', flag: '🇨🇲' },
  'CF': { name: 'Orta Afrika Cumhuriyeti', flag: '🇨🇫' },
  'GQ': { name: 'Ekvator Ginesi', flag: '🇬🇶' },
  'ST': { name: 'Sao Tome ve Principe', flag: '🇸🇹' },
  'AO': { name: 'Angola', flag: '🇦🇴' },
  'ZM': { name: 'Zambiya', flag: '🇿🇲' },
  'ZW': { name: 'Zimbabve', flag: '🇿🇼' },
  'MZ': { name: 'Mozambik', flag: '🇲🇿' },
  'MW': { name: 'Malavi', flag: '🇲🇼' },
  'BW': { name: 'Botsvana', flag: '🇧🇼' },
  'NA': { name: 'Namibya', flag: '🇳🇦' },
  'SZ': { name: 'Esvatini', flag: '🇸🇿' },
  'LS': { name: 'Lesoto', flag: '🇱🇸' },
  'MG': { name: 'Madagaskar', flag: '🇲🇬' },
  'MU': { name: 'Mauritius', flag: '🇲🇺' },
  'SC': { name: 'Seyşeller', flag: '🇸🇨' },
  'KM': { name: 'Komorlar', flag: '🇰🇲' },
  'SN': { name: 'Senegal', flag: '🇸🇳' },
  'GM': { name: 'Gambiya', flag: '🇬🇲' },
  'GW': { name: 'Gine-Bissau', flag: '🇬🇼' },
  'GN': { name: 'Gine', flag: '🇬🇳' },
  'SL': { name: 'Sierra Leone', flag: '🇸🇱' },
  'LR': { name: 'Liberya', flag: '🇱🇷' },
  'CI': { name: 'Fildişi Sahili', flag: '🇨🇮' },
  'BF': { name: 'Burkina Faso', flag: '🇧🇫' },
  'TG': { name: 'Togo', flag: '🇹🇬' },
  'BJ': { name: 'Benin', flag: '🇧🇯' },
  
  // AMERICAS
  'US': { name: 'ABD', flag: '🇺🇸' },
  'CA': { name: 'Kanada', flag: '🇨🇦' },
  'MX': { name: 'Meksika', flag: '🇲🇽' },
  'CU': { name: 'Küba', flag: '🇨🇺' },
  'JM': { name: 'Jamaika', flag: '🇯🇲' },
  'HT': { name: 'Haiti', flag: '🇭🇹' },
  'DO': { name: 'Dominik Cumhuriyeti', flag: '🇩🇴' },
  'PR': { name: 'Porto Riko', flag: '🇵🇷' },
  'GT': { name: 'Guatemala', flag: '🇬🇹' },
  'BZ': { name: 'Belize', flag: '🇧🇿' },
  'SV': { name: 'El Salvador', flag: '🇸🇻' },
  'HN': { name: 'Honduras', flag: '🇭🇳' },
  'NI': { name: 'Nikaragua', flag: '🇳🇮' },
  'CR': { name: 'Kosta Rika', flag: '🇨🇷' },
  'PA': { name: 'Panama', flag: '🇵🇦' },
  'CO': { name: 'Kolombiya', flag: '🇨🇴' },
  'VE': { name: 'Venezuela', flag: '🇻🇪' },
  'GY': { name: 'Guyana', flag: '🇬🇾' },
  'SR': { name: 'Surinam', flag: '🇸🇷' },
  'GF': { name: 'Fransız Guyanası', flag: '🇬🇫' },
  'EC': { name: 'Ekvador', flag: '🇪🇨' },
  'PE': { name: 'Peru', flag: '🇵🇪' },
  'BO': { name: 'Bolivya', flag: '🇧🇴' },
  'PY': { name: 'Paraguay', flag: '🇵🇾' },
  'CL': { name: 'Şili', flag: '🇨🇱' },
  'AR': { name: 'Arjantin', flag: '🇦🇷' },
  'UY': { name: 'Uruguay', flag: '🇺🇾' },
  'BR': { name: 'Brezilya', flag: '🇧🇷' },
  'FK': { name: 'Falkland Adaları', flag: '🇫🇰' },
  
  // ASIA PACIFIC
  'CN': { name: 'Çin', flag: '🇨🇳' },
  'JP': { name: 'Japonya', flag: '🇯🇵' },
  'KR': { name: 'Güney Kore', flag: '🇰🇷' },
  'KP': { name: 'Kuzey Kore', flag: '🇰🇵' },
  'MN': { name: 'Moğolistan', flag: '🇲🇳' },
  'TW': { name: 'Tayvan', flag: '🇹🇼' },
  'HK': { name: 'Hong Kong', flag: '🇭🇰' },
  'MO': { name: 'Makao', flag: '🇲🇴' },
  'IN': { name: 'Hindistan', flag: '🇮🇳' },
  'PK': { name: 'Pakistan', flag: '🇵🇰' },
  'BD': { name: 'Bangladeş', flag: '🇧🇩' },
  'LK': { name: 'Sri Lanka', flag: '🇱🇰' },
  'NP': { name: 'Nepal', flag: '🇳🇵' },
  'BT': { name: 'Bhutan', flag: '🇧🇹' },
  'MV': { name: 'Maldivler', flag: '🇲🇻' },
  'AF': { name: 'Afganistan', flag: '🇦🇫' },
  'MM': { name: 'Myanmar', flag: '🇲🇲' },
  'TH': { name: 'Tayland', flag: '🇹🇭' },
  'LA': { name: 'Laos', flag: '🇱🇦' },
  'KH': { name: 'Kamboçya', flag: '🇰🇭' },
  'VN': { name: 'Vietnam', flag: '🇻🇳' },
  'MY': { name: 'Malezya', flag: '🇲🇾' },
  'SG': { name: 'Singapur', flag: '🇸🇬' },
  'ID': { name: 'Endonezya', flag: '🇮🇩' },
  'BN': { name: 'Brunei', flag: '🇧🇳' },
  'PH': { name: 'Filipinler', flag: '🇵🇭' },
  'TL': { name: 'Doğu Timor', flag: '🇹🇱' },
  'PG': { name: 'Papua Yeni Gine', flag: '🇵🇬' },
  
  // OCEANIA
  'AU': { name: 'Avustralya', flag: '🇦🇺' },
  'NZ': { name: 'Yeni Zelanda', flag: '🇳🇿' },
  'FJ': { name: 'Fiji', flag: '🇫🇯' },
  'SB': { name: 'Solomon Adaları', flag: '🇸🇧' },
  'VU': { name: 'Vanuatu', flag: '🇻🇺' },
  'NC': { name: 'Yeni Kaledonya', flag: '🇳🇨' },
  'PF': { name: 'Fransız Polinezyası', flag: '🇵🇫' },
  'WS': { name: 'Samoa', flag: '🇼🇸' },
  'TO': { name: 'Tonga', flag: '🇹🇴' },
  'KI': { name: 'Kiribati', flag: '🇰🇮' },
  'TV': { name: 'Tuvalu', flag: '🇹🇻' },
  'NR': { name: 'Nauru', flag: '🇳🇷' },
  'PW': { name: 'Palau', flag: '🇵🇼' },
  'MH': { name: 'Marshall Adaları', flag: '🇲🇭' },
  'FM': { name: 'Mikronezya', flag: '🇫🇲' },
  
  // SCANDINAVIA
  'FO': { name: 'Faroe Adaları', flag: '🇫🇴' },
  'GL': { name: 'Grönland', flag: '🇬🇱' },
  'AX': { name: 'Åland', flag: '🇦🇽' },
  
  // CARIBBEAN
  'BS': { name: 'Bahamalar', flag: '🇧🇸' },
  'BB': { name: 'Barbados', flag: '🇧🇧' },
  'TT': { name: 'Trinidad ve Tobago', flag: '🇹🇹' },
  'GD': { name: 'Grenada', flag: '🇬🇩' },
  'LC': { name: 'Saint Lucia', flag: '🇱🇨' },
  'VC': { name: 'Saint Vincent ve Grenadinler', flag: '🇻🇨' },
  'AG': { name: 'Antigua ve Barbuda', flag: '🇦🇬' },
  'KN': { name: 'Saint Kitts ve Nevis', flag: '🇰🇳' },
  'DM': { name: 'Dominika', flag: '🇩🇲' },
  'AN': { name: 'Hollanda Antilleri', flag: '🇦🇳' },
  'AW': { name: 'Aruba', flag: '🇦🇼' },
  'CW': { name: 'Curaçao', flag: '🇨🇼' },
  'SX': { name: 'Sint Maarten', flag: '🇸🇽' },
  'BQ': { name: 'Karayip Hollandası', flag: '🇧🇶' },
  'KY': { name: 'Cayman Adaları', flag: '🇰🇾' },
  'TC': { name: 'Turks ve Caicos Adaları', flag: '🇹🇨' },
  'VG': { name: 'İngiliz Virgin Adaları', flag: '🇻🇬' },
  'VI': { name: 'ABD Virgin Adaları', flag: '🇻🇮' },
  'AI': { name: 'Anguilla', flag: '🇦🇮' },
  'MS': { name: 'Montserrat', flag: '🇲🇸' },
  'BM': { name: 'Bermuda', flag: '🇧🇲' },
  
  // SPECIAL
  'EU': { name: 'Avrupa', flag: '🇪🇺' },
  'UN': { name: 'Birleşmiş Milletler', flag: '🇺🇳' },
  'EN': { name: 'Uluslararası', flag: '🌍' },
  'INT': { name: 'Uluslararası', flag: '🌐' },
  'XXX': { name: 'Yetişkin', flag: '🔞' },
};

// AUTO-CATEGORIZATION PATTERNS
const categoryPatterns: Array<{ pattern: RegExp; group: string }> = [
  // SPORTS (high priority)
  { pattern: /\bspor\b|\bsport\b|futbol|maç|gol|nba|f1|formula|motorspor|yaris|at yarisi|tjk|ganyan|iddaa|canli skor/i, group: '⚽ Spor' },
  { pattern: /fight|box|mma|ufc|wrestle|güreş|boks/i, group: '🥊 Dövüş' },
  
  // MOVIES/CINEMA
  { pattern: /\bfilm\b|\bmovie\b|sinema|cinema|hbo|fox movies|movie star|cinema one|action|thriller|komedi|drama/i, group: '🎬 Sinema' },
  { pattern: /blu|gold|premium|platinum|vip/i, group: '💎 Premium' },
  
  // NEWS
  { pattern: /\bhaber\b|\bnews\b|haberler|gündem|cnbc|bbc|cnn|al jazeera|trt haber|ntv|halk tv|tele 1/i, group: '📰 Haber' },
  
  // DOCUMENTARY
  { pattern: /belgesel|documentary|discovery|nat geo|national geographic|history|science|animal planet|discovery science/i, group: '🔬 Belgesel' },
  
  // KIDS
  { pattern: /çocuk|kids|cartoon|disney|nickelodeon|nick jr|baby|minika|trt çocuk|yumurcak/i, group: '👶 Çocuk' },
  
  // MUSIC
  { pattern: /müzik|music|mtv|kral tv|dream tv|power|number one|taksim|street|rap|hip hop|pop|rock|jazz/i, group: '🎵 Müzik' },
  
  // LIFESTYLE/ENTERTAINMENT
  { pattern: /eğlence|entertainment|yasam|life|food|yemek|travel|seyahat|fashion|moda|dekorasyon|evim/i, group: '✨ Yaşam' },
  
  // RELIGIOUS
  { pattern: /dini|islam|diyanet|mecca|medina|kabe|medine|diyanet tv|canli yasin|namaz/i, group: '🕌 Dini' },
  
  // SERIES/TV SHOWS
  { pattern: /dizi|series|show|yabanci dizi|yerli dizi|fox|atv|star tv|kanal d|show tv|tv 8|kanal 7/i, group: '📺 Dizi' },
  
  // ADULT (last)
  { pattern: /xxx|adult|erotik|hot|sexy|playboy|brazzers|penthouse|private/i, group: '🔞 Yetişkin' },
];

// Quality detection from name
function detectQuality(name: string): M3UChannel['quality'] {
  if (/\b4k\b|uhd|ultra hd/i.test(name)) return '4K';
  if (/\bfhd\b|full hd/i.test(name)) return 'FHD';
  if (/\bhevc\b|h265|h\.265/i.test(name)) return 'HEVC';
  if (/\braw\b/i.test(name)) return 'RAW';
  if (/\bhd\b|high|high definition/i.test(name)) return 'HD';
  return 'SD';
}

// Extract country code from name (e.g., "TR • Kanal" -> "TR")
function extractCountryCode(name: string): { code: string; cleanName: string } {
  const match = name.match(/^([A-Z]{2,3})\s*•\s*/);
  if (match) {
    return {
      code: match[1],
      cleanName: name.substring(match[0].length).trim(),
    };
  }
  return { code: 'TR', cleanName: name }; // Default to TR
}

// Detect group/category from name
function detectGroup(name: string): string {
  const upperName = name.toUpperCase();
  
  for (const { pattern, group } of categoryPatterns) {
    if (pattern.test(upperName)) {
      return group;
    }
  }
  
  return '🏠 Ulusal'; // Default category
}

// Generate channel ID from URL
function generateId(url: string): string {
  const match = url.match(/\/(\d+)\.ts$/);
  return match ? match[1] : Math.random().toString(36).substring(2, 10);
}

// Parse M3U content
export function parseM3U(content: string): M3UChannel[] {
  const lines = content.split('\n');
  const channels: M3UChannel[] = [];
  let currentLine: Partial<M3UChannel> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('#EXTINF:')) {
      // Extract name after comma
      const commaIndex = trimmed.lastIndexOf(',');
      const rawName = commaIndex !== -1 
        ? trimmed.substring(commaIndex + 1).trim() 
        : trimmed;

      const { code, cleanName } = extractCountryCode(rawName);
      const quality = detectQuality(cleanName);
      const group = detectGroup(cleanName);

      currentLine = {
        id: '', // Will be set from URL
        name: cleanName,
        rawName: rawName,
        logo: '', // No logo in this format - can be added later
        group: group,
        countryCode: code,
        countryName: countryMap[code]?.name || code,
        quality: quality,
      };
    } else if (!trimmed.startsWith('#') && currentLine.name) {
      const id = generateId(trimmed);
      
      channels.push({
        ...currentLine,
        id: id,
        url: trimmed,
      } as M3UChannel);
      
      currentLine = {};
    }
  }

  return channels;
}

// Extract countries from channels
export function extractCountries(channels: M3UChannel[]): Country[] {
  const countryCounts = new Map<string, number>();

  channels.forEach(channel => {
    const code = channel.countryCode;
    if (code) {
      countryCounts.set(code, (countryCounts.get(code) || 0) + 1);
    }
  });

  const countries: Country[] = [];
  countryCounts.forEach((count, code) => {
    const info = countryMap[code];
    if (info) {
      countries.push({
        code,
        name: info.name,
        flag: info.flag,
        channelCount: count,
      });
    }
  });

  // Sort: TR first, then by channel count
  return countries.sort((a, b) => {
    if (a.code === 'TR') return -1;
    if (b.code === 'TR') return 1;
    return b.channelCount - a.channelCount;
  });
}

// Get channels by country
export function getChannelsByCountry(
  channels: M3UChannel[],
  countryCode: string
): M3UChannel[] {
  if (countryCode === 'ALL') return channels;
  return channels.filter(ch => ch.countryCode === countryCode);
}

// Get unique groups
export function getGroups(channels: M3UChannel[]): string[] {
  const groups = new Set(channels.map(ch => ch.group));
  return Array.from(groups).sort();
}

// Filter channels by search query
export function filterChannels(
  channels: M3UChannel[],
  searchQuery: string
): M3UChannel[] {
  if (!searchQuery.trim()) return channels;
  
  const query = searchQuery.toLowerCase();
  return channels.filter(ch =>
    ch.name.toLowerCase().includes(query) ||
    ch.group.toLowerCase().includes(query) ||
    ch.quality.toLowerCase().includes(query)
  );
}

export default parseM3U;
