"use client";

import { useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import Top3Albums, { type FavoriteAlbum } from "./Top3Albums";
import TracksList from "./TracksList";
import ReviewsList from "./ReviewsList";
import type { DiaryEntryUI, UnifiedReview } from "@/app/actions/diary";
import { toggleDiaryLike, getUserDiary } from "@/app/actions/diary";
import type { TrackDiaryEntryUI } from "@/app/actions/track-diary";
import type { UserList } from "@/app/actions/lists";
import ListsTab from "./ListsTab";

const PAGE_SIZE = 50;

type Tab = "journal" | "revues" | "titres" | "listes";
type ListenFilter = "all" | "listened" | "undiscovered";
type EcoutesSort = "date_listened" | "release_date" | "their_rating" | "my_rating";

type Props = {
  profileUserId: string;
  username: string;
  diaryEntries: DiaryEntryUI[];
  publicLists: UserList[];
  myListenedAlbums: Record<string, number | null>;
  isLoggedIn: boolean;
  favoriteAlbums?: FavoriteAlbum[];
  trackEntries?: TrackDiaryEntryUI[];
  unifiedReviews?: UnifiedReview[];
};

// ─── Ghost filter toggle (charte : minimal, éditorial) ───────────────────────
function FilterToggle<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <div className="flex items-center gap-1 text-[12px]">
      {options.map((opt, i) => (
        <span key={opt.id} className="flex items-center gap-1">
          {i > 0 && <span className="text-text-disabled select-none">·</span>}
          <button
            onClick={() => onChange(opt.id)}
            className={`transition-colors duration-150 ${
              value === opt.id
                ? "text-text-primary font-medium"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            {opt.label}
          </button>
        </span>
      ))}
    </div>
  );
}

// ─── Sort dropdown ───────────────────────────────────────────────────────────
function SortDropdown<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.id === value);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="text-[12px] text-text-tertiary hover:text-text-primary transition-colors duration-150 flex items-center gap-1"
      >
        Tri :{" "}
        <span className="font-medium text-text-primary">{current?.label}</span>
        <span className="text-[10px]">▾</span>
      </button>
      {open && (
        <div
          className="absolute top-full right-0 mt-2 bg-background border border-border rounded-[8px] z-10 min-w-max shadow-sm"
          onMouseLeave={() => setOpen(false)}
        >
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => { onChange(opt.id); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-[12px] transition-colors duration-150 ${
                value === opt.id
                  ? "bg-background-secondary text-text-primary font-medium"
                  : "text-text-tertiary hover:bg-background-secondary"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function PublicProfileTabs({
  profileUserId,
  diaryEntries,
  publicLists,
  myListenedAlbums,
  isLoggedIn,
  favoriteAlbums,
  trackEntries = [],
  unifiedReviews = [],
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const resolveTab = (raw: string | null): Tab => {
    if (raw === "revues" || raw === "listes" || raw === "titres") return raw;
    if (raw === "ecouter") return "listes";
    return "journal";
  };

  const [tab, setTab] = useState<Tab>(() => resolveTab(searchParams.get("tab")));
  const [allEntries, setAllEntries] = useState<DiaryEntryUI[]>(diaryEntries);
  const [hasMore, setHasMore] = useState(diaryEntries.length === PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);

  const handleTabChange = (t: Tab) => {
    setTab(t);
    const params = new URLSearchParams(searchParams.toString());
    if (t === "journal") {
      params.delete("tab");
    } else {
      params.set("tab", t);
    }
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };
  const [listenFilter, setListenFilter] = useState<ListenFilter>("all");
  const [ecoutesSort, setEcoutesSort] = useState<EcoutesSort>("date_listened");
  const [likeState, setLikeState] = useState<Record<string, { liked: boolean; count: number }>>(() =>
    Object.fromEntries(diaryEntries.map((e) => [e.id, { liked: e.is_liked, count: e.likes_count }]))
  );

  const loadMore = async () => {
    setLoadingMore(true);
    const more = await getUserDiary(profileUserId, allEntries.length, PAGE_SIZE);
    setAllEntries((prev) => [...prev, ...more]);
    setLikeState((prev) => ({
      ...prev,
      ...Object.fromEntries(more.map((e) => [e.id, { liked: e.is_liked, count: e.likes_count }])),
    }));
    setHasMore(more.length === PAGE_SIZE);
    setLoadingMore(false);
  };

  const handleLike = async (entryId: string) => {
    if (!isLoggedIn) return;
    setLikeState((prev) => {
      const cur = prev[entryId];
      return { ...prev, [entryId]: { liked: !cur.liked, count: cur.liked ? cur.count - 1 : cur.count + 1 } };
    });
    await toggleDiaryLike(entryId);
  };

  // Deduplicate diary by album (keep latest)
  const uniqueDiary = Array.from(
    new Map(allEntries.map((e) => [e.album_id, e])).values()
  );
  const reviews = Array.from(
    new Map(
      allEntries.filter((e) => e.review_body).map((e) => [e.album_id, e])
    ).values()
  );

  const TABS = [
    { id: "journal" as Tab, label: "Journal", count: uniqueDiary.length },
    { id: "titres" as Tab, label: "Titres", count: trackEntries.length },
    { id: "revues" as Tab, label: "Revues", count: unifiedReviews.length },
    { id: "listes" as Tab, label: "Listes", count: publicLists.length },
  ];

  const LISTEN_FILTER_OPTIONS: { id: ListenFilter; label: string }[] = [
    { id: "all", label: "Tout" },
    ...(isLoggedIn
      ? [
          { id: "listened" as ListenFilter, label: "Déjà écouté" },
          { id: "undiscovered" as ListenFilter, label: "Pas écouté" },
        ]
      : []),
  ];

  const ECOUTES_SORT_OPTIONS: { id: EcoutesSort; label: string }[] = [
    { id: "date_listened", label: "Date d'écoute" },
    { id: "release_date", label: "Parution" },
    { id: "their_rating", label: "Sa note" },
    ...(isLoggedIn ? [{ id: "my_rating" as EcoutesSort, label: "Ma note" }] : []),
  ];

  // ── Filters ──
  const applyListenFilter = (entries: DiaryEntryUI[]) => {
    if (listenFilter === "listened") return entries.filter((e) => e.album_id in myListenedAlbums);
    if (listenFilter === "undiscovered") return entries.filter((e) => !(e.album_id in myListenedAlbums));
    return entries;
  };

  // ── Sorts ──
  const sortDiary = (entries: DiaryEntryUI[]) =>
    [...entries].sort((a, b) => {
      switch (ecoutesSort) {
        case "release_date":
          return (new Date(b.release_date || 0).getTime()) - (new Date(a.release_date || 0).getTime());
        case "their_rating":
          return (b.rating ?? 0) - (a.rating ?? 0);
        case "my_rating":
          return (myListenedAlbums[b.album_id] ?? -1) - (myListenedAlbums[a.album_id] ?? -1);
        default:
          return new Date(b.listened_at).getTime() - new Date(a.listened_at).getTime();
      }
    });

  const filteredDiary = sortDiary(applyListenFilter(uniqueDiary));
  const filteredReviews = sortDiary(applyListenFilter(reviews));

  return (
    <div className="max-w-page mx-auto px-4 sm:px-6">
      {/* Albums favoris */}
      <Top3Albums userId={profileUserId} initialAlbums={favoriteAlbums} />
      <div className="py-6" />

      <div className="pb-28">
        {/* Tab bar */}
        <div className="flex gap-5 mb-8 border-b border-border-divider">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={`text-[14px] pb-3 transition-colors duration-150 border-b-2 -mb-px flex items-baseline gap-1.5 ${
                tab === t.id
                  ? "text-text-primary border-[#1C1C1C]"
                  : "text-text-tertiary hover:text-text-secondary border-transparent"
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className="text-[11px] text-text-disabled">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Journal ── */}
        {tab === "journal" && (
          <div>
            <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
              {isLoggedIn && (
                <FilterToggle
                  value={listenFilter}
                  onChange={setListenFilter}
                  options={LISTEN_FILTER_OPTIONS}
                />
              )}
              <div className={isLoggedIn ? "" : "ml-auto"}>
                <SortDropdown
                  value={ecoutesSort}
                  onChange={setEcoutesSort}
                  options={ECOUTES_SORT_OPTIONS}
                />
              </div>
            </div>

            {filteredDiary.length === 0 ? (
              <p className="text-center text-text-tertiary py-12 text-[14px]">
                {listenFilter === "listened"
                  ? "Aucun album en commun avec cet utilisateur"
                  : listenFilter === "undiscovered"
                  ? "Vous avez tout découvert — beau palmarès !"
                  : "Aucune écoute pour l'instant"}
              </p>
            ) : (
              <>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-6">
                  {filteredDiary.map((entry) => {
                    const myRating = myListenedAlbums[entry.album_id];
                    return (
                      <div key={entry.id}>
                        <Link
                          href={`/diary/${entry.id}`}
                          className="group relative block aspect-square rounded-[10px] overflow-hidden"
                        >
                          {entry.cover_url ? (
                            <Image
                              src={entry.cover_url}
                              alt={entry.album_title}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-background-tertiary" />
                          )}
                        </Link>
                        <div className="mt-2">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-medium text-text-primary truncate">
                                {entry.album_title}
                              </p>
                              <p className="text-[10px] text-text-tertiary truncate">
                                {entry.artist_name}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-0.5 ml-1.5 flex-shrink-0">
                              {entry.rating != null && (
                                <span className="text-[10px] font-medium text-[#8E6F5E]">
                                  {entry.rating}/10
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {hasMore && (
                  <div className="mt-8 text-center">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="text-[13px] text-text-tertiary hover:text-text-primary transition-colors duration-150 disabled:opacity-50"
                    >
                      {loadingMore ? "Chargement…" : "Charger plus"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Revues ── */}
        {tab === "revues" && (
          <ReviewsList reviews={unifiedReviews} />
        )}

        {/* ── Titres ── */}
        {tab === "titres" && (
          <TracksList userId={profileUserId} initialEntries={trackEntries} />
        )}

        {/* ── Listes ── */}
        {tab === "listes" && (
          <ListsTab lists={publicLists} isOwner={false} />
        )}
      </div>
    </div>
  );
}
