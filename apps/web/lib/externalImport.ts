export type RawExternalItem = {
  artist: string;
  album: string;
  mbid: string | null;
  rating?: number;
  reviewTitle?: string;
  reviewBody?: string;
  listenedAt?: string;
};

export function progressOfImportRow(row: any) {
  return {
    total: row.total_items,
    processed: row.processed_count,
    matched: row.matched_count,
    skipped: row.skipped_count ?? 0,
    failed: row.failed_count,
    listId: row.list_id,
  };
}
