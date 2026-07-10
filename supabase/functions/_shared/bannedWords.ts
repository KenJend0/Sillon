// Copie verbatim de apps/web/lib/bannedWords.ts — logique pure (pas de dépendance Next/Node),
// portable telle quelle vers Deno. Garder synchronisé si le fichier web évolue.

/**
 * Username moderation is intentionally stricter than free-form content.
 * Usernames should not impersonate staff/brand accounts, advertise services,
 * or contain explicit / abusive language. Reviews and comments are checked
 * against a narrower list to reduce false positives in legitimate discussion.
 */
const USERNAME_BANNED_WORDS: string[] = [
  // Slurs & hate speech (FR + EN)
  'nigger', 'nigga', 'negro', 'faggot', 'chink', 'spic', 'kike', 'raghead', 'towelhead',
  'coon', 'gook', 'wetback', 'tranny', 'pédé', 'pedale', 'tapette', 'tarlouze',
  'enculé', 'encule', 'nègre', 'négro', 'bougnoule', 'youpin', 'feuj', 'travelo',
  'chinetoque', 'sale arabe', 'sale juif', 'sale noir', 'sale blanc', 'islamiste',

  // Sexual / explicit (FR + EN)
  'porn', 'porno', 'pornhub', 'xvideos', 'xnxx', 'xxx', 'onlyfans', 'fansly',
  'nude', 'nudes', 'naked', 'camgirl', 'camgirls', 'escort', 'escorte',
  'sexe', 'sexe gratuit', 'sextape', 'plan cul', 'bite', 'chatte', 'couille',
  'couilles', 'branleur', 'branlette', 'branler', 'salope', 'pute', 'putain',
  'suce', 'baiser', 'niquer',

  // Harassment & insults
  'connard', 'connasse', 'fdp', 'tg', 'ta gueule', 'ferme ta gueule', 'abruti',
  'crétin', 'cretin', 'debile', 'débile', 'batard', 'bâtard', 'bitch', 'slut',

  // Violence & threats
  'kill yourself', 'kys', 'go die', 'die bitch', 'je vais te tuer',
  'je vais te niquer', 'menace de mort',

  // Spam patterns
  'onlyfans.com', 't.me/', 'telegram.me', 'discord.gg/', 'linktr.ee/', 'wa.me/',

  // Reserved / impersonation
  'admin', 'administrator', 'moderator', 'mod', 'support', 'staff', 'official',
  'waveform', 'waveformapp', 'teamwaveform', 'waveformteam', 'owner', 'founder',
  'security', 'contact', 'helpdesk', 'serviceclient', 'sav',
];

const CONTENT_BANNED_WORDS: string[] = [
  // Slurs & hate speech (FR + EN)
  'nigger', 'nigga', 'negro', 'faggot', 'chink', 'spic', 'kike', 'raghead', 'towelhead',
  'coon', 'gook', 'wetback', 'tranny', 'pédé', 'pedale', 'tapette', 'tarlouze',
  'enculé', 'encule', 'nègre', 'négro', 'bougnoule', 'youpin', 'feuj', 'travelo',
  'chinetoque', 'sale arabe', 'sale juif', 'sale noir', 'sale blanc',

  // Severe threats / self-harm encouragement
  'kill yourself', 'kys', 'go die', 'je vais te tuer', 'menace de mort',

  // Sexual spam / promo patterns
  'onlyfans', 'onlyfans.com', 'fansly', 'pornhub', 'xvideos', 'xnxx',
  'telegram.me', 'discord.gg/', 'linktr.ee/',
];

const CONTENT_BANNED_REGEXES: Array<{ raw: string; regex: RegExp }> = [
  { raw: 't.me/', regex: /(^|[^a-z0-9])t\.?me\/[a-z0-9_/-]+/i },
  { raw: 'wa.me/', regex: /(^|[^a-z0-9])wa\.?me\/[a-z0-9_/-]+/i },
];

const SHORT_WORD_MAX_LENGTH = 4;

type BannedPattern = {
  raw: string;
  normalized: string;
  compact: string;
  shortMatcher: RegExp | null;
};

function buildBannedPatterns(words: string[]): BannedPattern[] {
  return words.map((word) => {
    const normalized = normalizeForModeration(word);
    const compact = compactForModeration(normalized);

    return {
      raw: word,
      normalized,
      compact,
      shortMatcher: compact.length <= SHORT_WORD_MAX_LENGTH ? buildLooseShortWordRegex(compact) : null,
    };
  });
}

const USERNAME_BANNED_PATTERNS = buildBannedPatterns(USERNAME_BANNED_WORDS);
const CONTENT_BANNED_PATTERNS = buildBannedPatterns(CONTENT_BANNED_WORDS);

/**
 * Strict moderation for usernames.
 */
export function findBannedUsernameWord(text: string): string | null {
  return findBannedPattern(text, USERNAME_BANNED_PATTERNS);
}

/**
 * Narrower moderation for reviews and comments to reduce false positives.
 */
export function findBannedContentWord(text: string): string | null {
  const lower = text.toLowerCase();

  for (const pattern of CONTENT_BANNED_REGEXES) {
    if (pattern.regex.test(lower)) return pattern.raw;
  }

  return findBannedPattern(text, CONTENT_BANNED_PATTERNS);
}

function findBannedPattern(text: string, patterns: BannedPattern[]): string | null {
  const normalizedText = normalizeForModeration(text);
  const compactText = compactForModeration(normalizedText);

  for (const pattern of patterns) {
    if (pattern.shortMatcher?.test(normalizedText)) return pattern.raw;

    if (normalizedText.includes(pattern.normalized)) return pattern.raw;

    // Only use compact matching for longer patterns so short URL fragments like
    // "t.me" do not accidentally match across ordinary words in prose.
    if (pattern.compact.length > SHORT_WORD_MAX_LENGTH && compactText.includes(pattern.compact)) {
      return pattern.raw;
    }
  }

  return null;
}

function normalizeForModeration(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[0@]/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/[5$]/g, 's')
    .replace(/[7+]/g, 't')
    .replace(/8/g, 'b')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function compactForModeration(text: string): string {
  return text.replace(/[^a-z0-9]+/g, '');
}

function buildLooseShortWordRegex(word: string): RegExp {
  const pattern = word.split('').map(escapeRegex).join('\\s*');
  return new RegExp(`(^|[^a-z])${pattern}(?=$|[^a-z])`, 'i');
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
