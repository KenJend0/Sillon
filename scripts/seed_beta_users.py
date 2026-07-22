#!/usr/bin/env python3
"""
Seed 20 realistic beta users in Supabase:
- creates auth users (admin API)
- creates/updates profiles
- creates artists/albums if missing
- inserts ~15 diary entries per user with 1-3 reviews

Usage:
  python scripts/seed_beta_users.py --password 'ChangeMe_123!'

Required env vars:
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_KEY

Optional env vars:
  SEED_USERS_PASSWORD (fallback for --password)
  SEED_RESET=true|false   (default true; delete previous diary entries for seeded users)
"""

from __future__ import annotations

import argparse
import os
import random
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Tuple

from supabase import Client, create_client


@dataclass(frozen=True)
class SeedUser:
    username: str
    bio: str
    style: str
    created_at: str  # YYYY-MM-DD


USERS: List[SeedUser] = [
    SeedUser("ruefroide", "je note surtout le rap fr qui traine pas partout", "rap_fr_underground", "2025-01-12"),
    SeedUser("lucas_music", "jecoute un peu de tout", "mainstream", "2025-01-20"),
    SeedUser("lostinaudio", "je cherche des trucs un peu partout", "global_digger", "2025-01-05"),
    SeedUser("nightvibes", "musique pour le soir", "rnb_chill", "2025-01-18"),
    SeedUser("filmsonics", "les bandes originales c est la vie", "soundtracks", "2025-01-10"),
    SeedUser("ldnflow", "uk rap and grime", "uk", "2025-01-08"),
    SeedUser("indienight", "indie and alt vibes", "indie", "2025-01-15"),
    SeedUser("emma", "jecoute surtout en voiture", "casual", "2025-01-25"),
    SeedUser("caliente", "reggaeton and latino", "latino", "2025-01-10"),
    SeedUser("popdiary", "pop lover", "pop", "2025-01-18"),
    SeedUser("hardears", "note severe", "critic", "2025-01-05"),
    SeedUser("nightpulse", "electronic only", "electro", "2025-01-12"),
    SeedUser("oldrecords", "jazz and classics", "classic", "2025-01-07"),
    SeedUser("sunwave", "afrobeats lover", "afro", "2025-01-20"),
    SeedUser("antoine", "rap fr plus un peu de tout", "fr_casual", "2025-01-22"),
    SeedUser("soundtracklife", "film music only", "soundtrack", "2025-01-09"),
    SeedUser("guitars", "rock only", "rock", "2025-01-06"),
    SeedUser("softvoice", "rnb feminin", "rnb", "2025-01-14"),
    SeedUser("leo", "", "random", "2025-01-28"),
    SeedUser("noah", "", "minimal", "2025-01-30"),
]


STYLE_POOLS: Dict[str, List[Tuple[str, str]]] = {
    "rap_fr_underground": [
        ("Bitume Caviar, Vol. 01", "Prince Waly"), ("Moussa", "Prince Waly"), ("ERRR", "La Feve"),
        ("Akimbo", "Ziak"), ("LMF", "Freeze Corleone"), ("KH-22", "Ashe 22"),
        ("Melancholia", "Green Montana"), ("Meteo", "Jade"), ("Trinity", "Laylow"),
        ("Ipseite", "Damso"), ("JVLIVS II", "SCH"), ("NQNT 2", "Vald"),
        ("Mauvais Ordre", "Lomepal"), ("Civilisation", "Orelsan"), ("Feu", "Nekfeu"),
        ("Deux freres", "PNL"), ("A7", "SCH"), ("Pyramide", "Werenoi"),
    ],
    "mainstream": [
        ("Astroworld", "Travis Scott"), ("After Hours", "The Weeknd"), ("SOS", "SZA"),
        ("UTOPIA", "Travis Scott"), ("Take Care", "Drake"), ("Nothing Was the Same", "Drake"),
        ("Starboy", "The Weeknd"), ("Future Nostalgia", "Dua Lipa"), ("1989", "Taylor Swift"),
        ("Midnights", "Taylor Swift"), ("Scorpion", "Drake"), ("DAMN.", "Kendrick Lamar"),
        ("Blonde", "Frank Ocean"), ("Heroes and Villains", "Metro Boomin"), ("Un Verano Sin Ti", "Bad Bunny"),
        ("SOUR", "Olivia Rodrigo"), ("Planet Her", "Doja Cat"), ("Fine Line", "Harry Styles"),
    ],
    "global_digger": [
        ("Untrue", "Burial"), ("Clube da Esquina", "Milton Nascimento"), ("El Mal Querer", "Rosalia"),
        ("African Giant", "Burna Boy"), ("YHLQMDLG", "Bad Bunny"), ("Rave and Roses", "Rema"),
        ("Blue Lines", "Massive Attack"), ("Souvlaki", "Slowdive"), ("Lonerism", "Tame Impala"),
        ("MM..FOOD", "MF DOOM"), ("Rumours", "Fleetwood Mac"), ("In Rainbows", "Radiohead"),
        ("Renaissance", "Beyonce"), ("Por Cesarea", "Dillom"), ("Heligoland", "Massive Attack"),
        ("Dragon New Warm Mountain I Believe In You", "Big Thief"), ("Kind of Blue", "Miles Davis"),
    ],
    "rnb_chill": [
        ("WASTELAND", "Brent Faiyaz"), ("Gemini Rights", "Steve Lacy"), ("Ctrl", "SZA"),
        ("Isolation", "Kali Uchis"), ("Freudian", "Daniel Caesar"), ("Blonde", "Frank Ocean"),
        ("Take Me Apart", "Kelela"), ("Lahai", "Sampha"), ("Over It", "Summer Walker"),
        ("A Seat at the Table", "Solange"), ("Trip", "Jhene Aiko"), ("Saturn", "Nao"),
        ("SOS", "SZA"), ("HEAVN", "Jamila Woods"), ("Good to Know", "JoJo"),
        ("The Age of Pleasure", "Janelle Monae"), ("Heaux Tales", "Jazmine Sullivan"),
    ],
    "soundtracks": [
        ("La La Land", "Justin Hurwitz"), ("Babylon", "Justin Hurwitz"), ("Interstellar", "Hans Zimmer"),
        ("Inception", "Hans Zimmer"), ("Dune", "Hans Zimmer"), ("Oppenheimer", "Ludwig Goransson"),
        ("The Social Network", "Trent Reznor and Atticus Ross"), ("Blade Runner 2049", "Hans Zimmer and Benjamin Wallfisch"),
        ("Whiplash", "Justin Hurwitz"), ("Tenet", "Ludwig Goransson"), ("The Batman", "Michael Giacchino"),
        ("How to Train Your Dragon", "John Powell"), ("The Grand Budapest Hotel", "Alexandre Desplat"),
        ("Spirited Away", "Joe Hisaishi"), ("Arrival", "Johann Johannsson"), ("Up", "Michael Giacchino"),
    ],
    "uk": [
        ("Psychodrama", "Dave"), ("Konnichiwa", "Skepta"), ("We're All Alone in This Together", "Dave"),
        ("23", "Central Cee"), ("Split Decision", "Central Cee"), ("Made in the Manor", "Kano"),
        ("Gang Signs and Prayer", "Stormzy"), ("Heavy Is the Head", "Stormzy"), ("Boy in da Corner", "Dizzee Rascal"),
        ("Not Waving, but Drowning", "Loyle Carner"), ("Alpha Place", "Knucks"), ("Ignorance Is Bliss", "Skepta"),
        ("Home Alone 2", "D Block Europe"), ("Unknown T", "Unknown T"), ("Big Conspiracy", "J Hus"),
    ],
    "indie": [
        ("AM", "Arctic Monkeys"), ("Favourite Worst Nightmare", "Arctic Monkeys"), ("Currents", "Tame Impala"),
        ("Is This It", "The Strokes"), ("The New Abnormal", "The Strokes"), ("Melodrama", "Lorde"),
        ("Punisher", "Phoebe Bridgers"), ("A Moon Shaped Pool", "Radiohead"), ("In Rainbows", "Radiohead"),
        ("Wolfgang Amadeus Phoenix", "Phoenix"), ("The Suburbs", "Arcade Fire"), ("An Awesome Wave", "alt-J"),
        ("Lonerism", "Tame Impala"), ("I Love You.", "The Neighbourhood"), ("Souvlaki", "Slowdive"),
    ],
    "casual": [
        ("Starboy", "The Weeknd"), ("Future Nostalgia", "Dua Lipa"), ("1989", "Taylor Swift"),
        ("Divide", "Ed Sheeran"), ("Fine Line", "Harry Styles"), ("SOUR", "Olivia Rodrigo"),
        ("Planet Her", "Doja Cat"), ("After Hours", "The Weeknd"), ("Midnights", "Taylor Swift"),
        ("The Fame Monster", "Lady Gaga"), ("21", "Adele"), ("Teenage Dream", "Katy Perry"),
        ("Montero", "Lil Nas X"), ("Purpose", "Justin Bieber"), ("When We All Fall Asleep, Where Do We Go?", "Billie Eilish"),
    ],
    "latino": [
        ("YHLQMDLG", "Bad Bunny"), ("Un Verano Sin Ti", "Bad Bunny"), ("Motomami", "Rosalia"),
        ("DATA", "Tainy"), ("SATURNO", "Rauw Alejandro"), ("OASIS", "J Balvin and Bad Bunny"),
        ("Manana Sera Bonito", "KAROL G"), ("VICE VERSA", "Rauw Alejandro"), ("Colores", "J Balvin"),
        ("Formula, Vol. 3", "Romeo Santos"), ("Afrodisiaco", "Rauw Alejandro"), ("Vibras", "J Balvin"),
        ("KG0516", "KAROL G"), ("Feliz Cumpleanos Ferxxo Te Pirateamos el Album", "Feid"), ("x100PRE", "Bad Bunny"),
    ],
    "pop": [
        ("Midnights", "Taylor Swift"), ("Future Nostalgia", "Dua Lipa"), ("Born This Way", "Lady Gaga"),
        ("1989", "Taylor Swift"), ("SOUR", "Olivia Rodrigo"), ("Teenage Dream", "Katy Perry"),
        ("Emotion", "Carly Rae Jepsen"), ("Dangerous Woman", "Ariana Grande"), ("The Fame Monster", "Lady Gaga"),
        ("Melodrama", "Lorde"), ("When We All Fall Asleep, Where Do We Go?", "Billie Eilish"), ("30", "Adele"),
        ("emails i can't send", "Sabrina Carpenter"), ("BRAT", "Charli XCX"), ("Pure Heroine", "Lorde"),
    ],
    "critic": [
        ("Astroworld", "Travis Scott"), ("UTOPIA", "Travis Scott"), ("After Hours", "The Weeknd"),
        ("SOS", "SZA"), ("Scorpion", "Drake"), ("Certified Lover Boy", "Drake"),
        ("Midnights", "Taylor Swift"), ("DAMN.", "Kendrick Lamar"), ("Blonde", "Frank Ocean"),
        ("The Life of Pablo", "Kanye West"), ("Heroes and Villains", "Metro Boomin"),
        ("Mr. Morale and The Big Steppers", "Kendrick Lamar"), ("Views", "Drake"),
        ("Renaissance", "Beyonce"), ("For All the Dogs", "Drake"),
    ],
    "electro": [
        ("Discovery", "Daft Punk"), ("Random Access Memories", "Daft Punk"), ("Untrue", "Burial"),
        ("Immunity", "Jon Hopkins"), ("Syro", "Aphex Twin"), ("Cross", "Justice"),
        ("In Colour", "Jamie xx"), ("Settle", "Disclosure"), ("Nurture", "Porter Robinson"),
        ("Singularity", "Jon Hopkins"), ("Crush", "Floating Points"), ("Alive 2007", "Daft Punk"),
        ("LP5", "Autechre"), ("Immunity", "Clairo"), ("Endtroducing.....", "DJ Shadow"),
    ],
    "classic": [
        ("Kind of Blue", "Miles Davis"), ("A Love Supreme", "John Coltrane"), ("Blue Train", "John Coltrane"),
        ("Mingus Ah Um", "Charles Mingus"), ("Time Out", "The Dave Brubeck Quartet"),
        ("Getz/Gilberto", "Stan Getz and Joao Gilberto"), ("Ella and Louis", "Ella Fitzgerald and Louis Armstrong"),
        ("The Shape of Jazz to Come", "Ornette Coleman"), ("Head Hunters", "Herbie Hancock"),
        ("Bitches Brew", "Miles Davis"), ("The Black Saint and the Sinner Lady", "Charles Mingus"),
        ("Maiden Voyage", "Herbie Hancock"), ("Speak No Evil", "Wayne Shorter"),
        ("The Koln Concert", "Keith Jarrett"), ("Sketches of Spain", "Miles Davis"),
    ],
    "afro": [
        ("African Giant", "Burna Boy"), ("Made in Lagos", "Wizkid"), ("Twice As Tall", "Burna Boy"),
        ("Rave and Roses", "Rema"), ("Boy Alone", "Omah Lay"), ("Mr. Money with the Vibe", "Asake"),
        ("I Told Them...", "Burna Boy"), ("Work of Art", "Asake"), ("Timeless", "Davido"),
        ("Lungu Boy", "Asake"), ("HEIS", "Rema"), ("GEMINI", "Rema"),
        ("Playboy", "Fireboy DML"), ("L.I.F.E", "Burna Boy"), ("A Better Time", "Davido"),
    ],
    "fr_casual": [
        ("Feu", "Nekfeu"), ("Trinity", "Laylow"), ("Ipseite", "Damso"),
        ("Racine Carree", "Stromae"), ("Mauvais Ordre", "Lomepal"), ("Civilisation", "Orelsan"),
        ("JVLIVS II", "SCH"), ("NQNT 2", "Vald"), ("A7", "SCH"),
        ("Lecole du micro dargent", "IAM"), ("Pyramide", "Werenoi"), ("Deux freres", "PNL"),
        ("QALF Infinity", "Damso"), ("Ceinture noire", "Gims"), ("1989", "Taylor Swift"),
    ],
    "soundtrack": [
        ("Interstellar", "Hans Zimmer"), ("Inception", "Hans Zimmer"), ("Dune", "Hans Zimmer"),
        ("The Dark Knight", "Hans Zimmer and James Newton Howard"), ("Oppenheimer", "Ludwig Goransson"),
        ("Black Panther", "Ludwig Goransson"), ("The Batman", "Michael Giacchino"),
        ("Up", "Michael Giacchino"), ("How to Train Your Dragon", "John Powell"),
        ("Spider-Man: Across the Spider-Verse", "Daniel Pemberton"), ("The Social Network", "Trent Reznor and Atticus Ross"),
        ("Gone Girl", "Trent Reznor and Atticus Ross"), ("Arrival", "Johann Johannsson"),
        ("Spirited Away", "Joe Hisaishi"), ("La La Land", "Justin Hurwitz"),
    ],
    "rock": [
        ("Nevermind", "Nirvana"), ("Back in Black", "AC/DC"), ("The Dark Side of the Moon", "Pink Floyd"),
        ("Led Zeppelin IV", "Led Zeppelin"), ("Rumours", "Fleetwood Mac"), ("American Idiot", "Green Day"),
        ("The Black Parade", "My Chemical Romance"), ("OK Computer", "Radiohead"), ("Is This It", "The Strokes"),
        ("Toxicity", "System of a Down"), ("Californication", "Red Hot Chili Peppers"), ("AM", "Arctic Monkeys"),
        ("Demon Days", "Gorillaz"), ("Absolution", "Muse"), ("In Rainbows", "Radiohead"),
    ],
    "rnb": [
        ("Ctrl", "SZA"), ("SOS", "SZA"), ("Heaux Tales", "Jazmine Sullivan"),
        ("Over It", "Summer Walker"), ("The Age of Pleasure", "Janelle Monae"), ("Take Me Apart", "Kelela"),
        ("A Seat at the Table", "Solange"), ("Trip", "Jhene Aiko"), ("Isolation", "Kali Uchis"),
        ("The Miseducation of Lauryn Hill", "Lauryn Hill"), ("Good to Know", "JoJo"),
        ("Aaliyah", "Aaliyah"), ("Honey", "Robyn"), ("The Diary of Alicia Keys", "Alicia Keys"),
        ("Lahai", "Sampha"),
    ],
    "random": [
        ("AM", "Arctic Monkeys"), ("After Hours", "The Weeknd"), ("DAMN.", "Kendrick Lamar"),
        ("Discovery", "Daft Punk"), ("Future Nostalgia", "Dua Lipa"), ("Nevermind", "Nirvana"),
        ("Ctrl", "SZA"), ("Un Verano Sin Ti", "Bad Bunny"), ("Kind of Blue", "Miles Davis"),
        ("Astroworld", "Travis Scott"), ("Midnights", "Taylor Swift"), ("Psychodrama", "Dave"),
        ("Interstellar", "Hans Zimmer"), ("Mauvais Ordre", "Lomepal"), ("Blonde", "Frank Ocean"),
    ],
    "minimal": [
        ("Thriller", "Michael Jackson"), ("Random Access Memories", "Daft Punk"), ("1989", "Taylor Swift"),
        ("After Hours", "The Weeknd"), ("AM", "Arctic Monkeys"), ("Nevermind", "Nirvana"),
        ("Future Nostalgia", "Dua Lipa"), ("Take Care", "Drake"), ("Currents", "Tame Impala"),
        ("Ctrl", "SZA"), ("Interstellar", "Hans Zimmer"), ("YHLQMDLG", "Bad Bunny"),
        ("Kind of Blue", "Miles Davis"), ("Psychodrama", "Dave"), ("La La Land", "Justin Hurwitz"),
    ],
}


RATING_BIAS: Dict[str, float] = {
    "critic": -1.2,
    "minimal": -0.3,
    "casual": 0.0,
    "mainstream": 0.2,
    "global_digger": 0.4,
    "classic": 0.7,
    "soundtracks": 0.8,
    "soundtrack": 0.8,
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed beta users and diary entries")
    parser.add_argument("--password", help="password used for all seed users")
    parser.add_argument("--logs-per-user", type=int, default=15)
    parser.add_argument("--reset", action="store_true", help="delete existing diary entries for seeded users before insert")
    parser.add_argument("--no-reset", action="store_true", help="keep existing diary entries and append new ones")
    return parser.parse_args()


def read_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required env var: {name}")
    return value


def safe_iso(dt: datetime) -> str:
    return dt.replace(microsecond=0, tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")


def build_email(username: str) -> str:
    return f"{username}@seed.sillon.local"


def clamp_int(v: float, lo: int, hi: int) -> int:
    return max(lo, min(hi, int(round(v))))


def make_reviews(style: str) -> List[str]:
    templates = {
        "critic": ["propre mais trop long", "quelques bonnes idees", "execution inegale"],
        "soundtracks": ["excellent score", "super immersion", "tres cinematique"],
        "soundtrack": ["excellent score", "super immersion", "tres cinematique"],
        "rap_fr_underground": ["no skip", "bonne energie", "tres coherent"],
        "default": ["solide", "bonne surprise", "ca tourne bien"],
    }
    return templates.get(style, templates["default"])


def build_entries_for_user(user: SeedUser, logs_per_user: int, rng: random.Random) -> List[dict]:
    pool = STYLE_POOLS.get(user.style) or STYLE_POOLS["random"]
    picks = pool[:]
    rng.shuffle(picks)

    if len(picks) < logs_per_user:
        fallback = STYLE_POOLS["mainstream"][:]
        rng.shuffle(fallback)
        picks.extend(fallback)

    selected = picks[:logs_per_user]

    start_dt = datetime(2025, 2, 1, 20, 0, tzinfo=timezone.utc) + timedelta(days=rng.randint(0, 3))
    review_count = rng.randint(1, 3)
    review_texts = make_reviews(user.style)
    review_slots = set(sorted(rng.sample(range(logs_per_user), k=review_count)))

    style_bias = RATING_BIAS.get(user.style, 0.1)
    entries = []
    for i, (title, artist) in enumerate(selected):
        ts = start_dt + timedelta(days=i * 3 + rng.randint(0, 1), hours=rng.randint(-2, 2))
        base = rng.normalvariate(7.6 + style_bias, 1.0)
        rating = clamp_int(base, 5, 10)
        review_body = None
        if i in review_slots:
            review_body = review_texts[i % len(review_texts)]

        entries.append(
            {
                "title": title,
                "artist": artist,
                "listened_at": safe_iso(ts),
                "created_at": safe_iso(ts),
                "rating": rating,
                "review_body": review_body,
            }
        )
    return entries


def fetch_users_by_email(client: Client) -> Dict[str, str]:
    """Return {email: user_id} from auth.admin.list_users paginated results."""
    page = 1
    per_page = 200
    out: Dict[str, str] = {}

    while True:
        response = client.auth.admin.list_users({"page": page, "per_page": per_page})
        users = getattr(response, "users", None)
        if users is None and isinstance(response, dict):
            users = response.get("users", [])
        if not users:
            break

        for u in users:
            if isinstance(u, dict):
                email = u.get("email")
                uid = u.get("id")
            else:
                email = getattr(u, "email", None)
                uid = getattr(u, "id", None)
            if email and uid:
                out[email] = uid

        if len(users) < per_page:
            break
        page += 1

    return out


def ensure_auth_user(client: Client, user: SeedUser, password: str, known: Dict[str, str]) -> str:
    email = build_email(user.username)
    if email in known:
        return known[email]

    response = client.auth.admin.create_user(
        {
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {
                "seed": True,
                "username": user.username,
                "style": user.style,
            },
        }
    )

    created_user = getattr(response, "user", None)
    if created_user is None and isinstance(response, dict):
        created_user = response.get("user")

    if isinstance(created_user, dict):
        uid = created_user.get("id")
    else:
        uid = getattr(created_user, "id", None)

    if not uid:
        raise RuntimeError(f"Could not create auth user for {user.username}")

    known[email] = uid
    return uid


def ensure_profile(client: Client, user_id: str, user: SeedUser) -> None:
    created_ts = f"{user.created_at}T10:00:00Z"
    payload = {
        "id": user_id,
        "username": user.username,
        "display_name": user.username,
        "bio": user.bio,
        "created_at": created_ts,
    }
    client.table("profiles").upsert(payload, on_conflict="id").execute()


def find_or_create_artist(client: Client, artist_name: str) -> str:
    found = client.table("artists").select("id").eq("name", artist_name).limit(1).execute()
    data = getattr(found, "data", None) or []
    if data:
        return data[0]["id"]

    inserted = client.table("artists").insert({"name": artist_name}).execute()
    inserted_data = getattr(inserted, "data", None) or []
    if not inserted_data:
        # Retry fetch in case of race conditions.
        retry = client.table("artists").select("id").eq("name", artist_name).limit(1).execute()
        retry_data = getattr(retry, "data", None) or []
        if retry_data:
            return retry_data[0]["id"]
        raise RuntimeError(f"Could not create artist: {artist_name}")
    return inserted_data[0]["id"]


def find_or_create_album(client: Client, artist_id: str, title: str) -> str:
    found = (
        client.table("albums")
        .select("id")
        .eq("artist_id", artist_id)
        .eq("title", title)
        .limit(1)
        .execute()
    )
    data = getattr(found, "data", None) or []
    if data:
        return data[0]["id"]

    inserted = client.table("albums").insert({"artist_id": artist_id, "title": title}).execute()
    inserted_data = getattr(inserted, "data", None) or []
    if not inserted_data:
        retry = (
            client.table("albums")
            .select("id")
            .eq("artist_id", artist_id)
            .eq("title", title)
            .limit(1)
            .execute()
        )
        retry_data = getattr(retry, "data", None) or []
        if retry_data:
            return retry_data[0]["id"]
        raise RuntimeError(f"Could not create album: {title} / {artist_id}")
    return inserted_data[0]["id"]


def reset_diary_entries(client: Client, user_id: str) -> None:
    client.table("diary_entries").delete().eq("user_id", user_id).execute()


def insert_entries(client: Client, user_id: str, entries: List[dict]) -> int:
    rows = []
    for e in entries:
        artist_id = find_or_create_artist(client, e["artist"])
        album_id = find_or_create_album(client, artist_id, e["title"])

        rows.append(
            {
                "user_id": user_id,
                "album_id": album_id,
                "listened_at": e["listened_at"],
                "rating": e["rating"],
                "review_body": e["review_body"],
                "is_public": True,
                "created_at": e["created_at"],
            }
        )

    if rows:
        client.table("diary_entries").insert(rows).execute()
    return len(rows)


def main() -> None:
    args = parse_args()

    supabase_url = read_env("NEXT_PUBLIC_SUPABASE_URL")
    service_key = read_env("SUPABASE_SERVICE_KEY")
    password = (args.password or os.getenv("SEED_USERS_PASSWORD", "")).strip()
    if not password:
        raise RuntimeError("Provide --password or SEED_USERS_PASSWORD")

    reset_default = os.getenv("SEED_RESET", "true").lower() == "true"
    do_reset = (reset_default and not args.no_reset) or args.reset

    client = create_client(supabase_url, service_key)
    rng = random.Random(20260414)

    print("[seed] fetching existing auth users...")
    known_users = fetch_users_by_email(client)

    total_profiles = 0
    total_entries = 0

    for user in USERS:
        user_id = ensure_auth_user(client, user, password, known_users)
        ensure_profile(client, user_id, user)
        total_profiles += 1

        if do_reset:
            reset_diary_entries(client, user_id)

        entries = build_entries_for_user(user, args.logs_per_user, rng)
        inserted = insert_entries(client, user_id, entries)
        total_entries += inserted
        print(f"[seed] {user.username}: {inserted} entries")

    print("[seed] done")
    print(f"[seed] profiles upserted: {total_profiles}")
    print(f"[seed] diary entries inserted: {total_entries}")


if __name__ == "__main__":
    main()
