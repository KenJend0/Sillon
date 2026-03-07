export type GenreEntry = { label: string; slug: string };
export type GenreFamily = GenreEntry & { subgenres: GenreEntry[] };

export const GENRE_FAMILIES: GenreFamily[] = [
    { label: 'Hip-hop / Rap',     slug: 'hip-hop',    subgenres: [
        { label: 'Trap',             slug: 'trap'              },
        { label: 'Drill',            slug: 'drill'             },
        { label: 'Boom bap',         slug: 'boom-bap'          },
        { label: 'Cloud rap',        slug: 'cloud-rap'         },
        { label: 'Afrotrap',         slug: 'afrotrap'          },
        { label: 'Lo-fi hip-hop',    slug: 'lo-fi-hip-hop'     },
        { label: 'Conscious rap',    slug: 'conscious-rap'     },
    ]},
    { label: 'R&B / Soul',        slug: 'soul',       subgenres: [
        { label: 'Neo-soul',         slug: 'neo-soul'          },
        { label: 'R&B contemporain', slug: 'contemporary-rnb'  },
        { label: 'Gospel',           slug: 'gospel'            },
    ]},
    { label: 'Pop',               slug: 'pop',        subgenres: [
        { label: 'Indie pop',        slug: 'indie-pop'         },
        { label: 'Synth-pop',        slug: 'synth-pop'         },
        { label: 'Dream pop',        slug: 'dream-pop'         },
        { label: 'Dance-pop',        slug: 'dance-pop'         },
        { label: 'Art pop',          slug: 'art-pop'           },
        { label: 'K-pop',            slug: 'k-pop'             },
    ]},
    { label: 'Rock',              slug: 'rock',       subgenres: [
        { label: 'Indie rock',       slug: 'indie-rock'        },
        { label: 'Alt. rock',        slug: 'alternative-rock'  },
        { label: 'Punk',             slug: 'punk'              },
        { label: 'Post-rock',        slug: 'post-rock'         },
        { label: 'Grunge',           slug: 'grunge'            },
        { label: 'Psychédélique',    slug: 'psychedelic-rock'  },
        { label: 'Garage rock',      slug: 'garage-rock'       },
    ]},
    { label: 'Électronique',      slug: 'electronic', subgenres: [
        { label: 'House',            slug: 'house'             },
        { label: 'Techno',           slug: 'techno'            },
        { label: 'Ambient',          slug: 'ambient'           },
        { label: 'Drum & Bass',      slug: 'drum-and-bass'     },
        { label: 'Trip-hop',         slug: 'trip-hop'          },
        { label: 'IDM',              slug: 'idm'               },
        { label: 'Trance',           slug: 'trance'            },
    ]},
    { label: 'Jazz',              slug: 'jazz',       subgenres: [
        { label: 'Bebop',            slug: 'bebop'             },
        { label: 'Free jazz',        slug: 'free-jazz'         },
        { label: 'Jazz fusion',      slug: 'jazz-fusion'       },
        { label: 'Nu jazz',          slug: 'nu-jazz'           },
    ]},
    { label: 'Folk / Acoustique', slug: 'folk',       subgenres: [
        { label: 'Indie folk',       slug: 'indie-folk'        },
        { label: 'Singer-songwriter',slug: 'singer-songwriter' },
        { label: 'Bluegrass',        slug: 'bluegrass'         },
        { label: 'Country',          slug: 'country'           },
    ]},
    { label: 'Classique',         slug: 'classical',  subgenres: [
        { label: 'Baroque',          slug: 'baroque'           },
        { label: 'Romantique',       slug: 'romantic'          },
        { label: 'Minimaliste',      slug: 'minimalism'        },
        { label: 'Opéra',            slug: 'opera'             },
    ]},
    { label: 'Metal',             slug: 'metal',      subgenres: [
        { label: 'Heavy metal',      slug: 'heavy-metal'       },
        { label: 'Death metal',      slug: 'death-metal'       },
        { label: 'Black metal',      slug: 'black-metal'       },
        { label: 'Doom metal',       slug: 'doom-metal'        },
        { label: 'Post-metal',       slug: 'post-metal'        },
    ]},
    { label: 'Reggae',            slug: 'reggae',     subgenres: [
        { label: 'Dancehall',        slug: 'dancehall'         },
        { label: 'Dub',              slug: 'dub'               },
        { label: 'Roots reggae',     slug: 'roots-reggae'      },
        { label: 'Ska',              slug: 'ska'               },
    ]},
    { label: 'Funk',              slug: 'funk',       subgenres: [] },
    { label: 'Latin',             slug: 'latin',      subgenres: [
        { label: 'Reggaeton',        slug: 'reggaeton'         },
        { label: 'Salsa',            slug: 'salsa'             },
        { label: 'Bossa nova',       slug: 'bossa-nova'        },
        { label: 'Cumbia',           slug: 'cumbia'            },
    ]},
    { label: 'Afrobeats',         slug: 'afrobeats',  subgenres: [
        { label: 'Amapiano',         slug: 'amapiano'          },
        { label: 'Afropop',          slug: 'afropop'           },
        { label: 'Highlife',         slug: 'highlife'          },
    ]},
    { label: 'Blues',             slug: 'blues',      subgenres: [
        { label: 'Delta blues',      slug: 'delta-blues'       },
        { label: 'Chicago blues',    slug: 'chicago-blues'     },
    ]},
    { label: 'Bande originale',   slug: 'soundtrack', subgenres: [
        { label: 'Film',             slug: 'film-score'        },
        { label: 'Jeux vidéo',       slug: 'video-game-music'  },
    ]},
];

export function findGenreBySlug(slug: string): GenreEntry | null {
    for (const family of GENRE_FAMILIES) {
        if (family.slug === slug) return { label: family.label, slug: family.slug };
        for (const sub of family.subgenres) {
            if (sub.slug === slug) return sub;
        }
    }
    return null;
}

export type GenreSlug = string;
