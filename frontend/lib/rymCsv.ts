import type { RawExternalItem } from '@/lib/externalImport';

// Colonnes fixes de l'export RYM ("Catalog > Export as CSV") — l'en-tête a un
// espacement irrégulier, on indexe par position plutôt que par nom de colonne.
const COL = {
  FIRST_NAME: 1,
  LAST_NAME: 2,
  TITLE: 5,
  RELEASE_DATE: 6,
  RATING: 7,
  REVIEW: 11,
  REVIEW_TITLE: 12,
};

/** Parseur CSV tolérant aux champs multi-lignes (les critiques RYM peuvent contenir des retours à la ligne). */
function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (inQuotes) {
      if (c === '"') {
        if (content[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(cur);
      cur = '';
    } else if (c === '\r') {
      // ignoré, géré via \n
    } else if (c === '\n') {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = '';
    } else {
      cur += c;
    }
  }
  if (cur !== '' || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

/**
 * Les exports RYM contiennent souvent du mojibake (UTF-8 ré-interprété en
 * Latin-1 puis ré-encodé) — ex: "PiÃ±ata" au lieu de "Piñata". On ne corrige
 * que les chaînes qui portent la trace de ce bug (présence de "Ã") pour ne
 * pas abîmer du texte déjà correct.
 */
function fixMojibake(s: string): string {
  if (!s || !s.includes('Ã')) return s;
  try {
    const fixed = Buffer.from(s, 'latin1').toString('utf8');
    return fixed.includes('�') ? s : fixed;
  } catch {
    return s;
  }
}

function unescapeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function clean(s: string | undefined): string {
  return s ? unescapeHtml(fixMojibake(s.trim())) : '';
}

export function parseRymCsv(fileContent: string): RawExternalItem[] {
  const rows = parseCsv(fileContent);
  const dataRows = rows.slice(1); // skip header

  const items: RawExternalItem[] = [];
  for (const fields of dataRows) {
    if (fields.length < COL.RATING + 1) continue;

    const firstName = clean(fields[COL.FIRST_NAME]);
    const lastName = clean(fields[COL.LAST_NAME]);
    const artist = [firstName, lastName].filter(Boolean).join(' ');
    const album = clean(fields[COL.TITLE]);
    if (!artist || !album) continue;

    const ratingRaw = parseInt(fields[COL.RATING], 10);
    const rating = Number.isFinite(ratingRaw) && ratingRaw >= 0 && ratingRaw <= 10 ? ratingRaw : undefined;

    const yearMatch = fields[COL.RELEASE_DATE]?.match(/\d{4}/);
    const listenedAt = yearMatch ? `${yearMatch[0]}-01-01` : undefined;

    const reviewBody = clean(fields[COL.REVIEW]) || undefined;
    const reviewTitle = clean(fields[COL.REVIEW_TITLE]) || undefined;

    items.push({ artist, album, mbid: null, rating, reviewBody, reviewTitle, listenedAt });
  }

  return items;
}
