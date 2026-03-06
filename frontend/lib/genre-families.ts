export const GENRE_FAMILIES = [
    { label: 'Hip-hop / Rap',     slug: 'hip-hop'     },
    { label: 'R&B / Soul',        slug: 'soul'        },
    { label: 'Pop',               slug: 'pop'         },
    { label: 'Rock',              slug: 'rock'        },
    { label: 'Électronique',      slug: 'electronic'  },
    { label: 'Jazz',              slug: 'jazz'        },
    { label: 'Folk / Acoustique', slug: 'folk'        },
    { label: 'Classique',         slug: 'classical'   },
    { label: 'Metal',             slug: 'metal'       },
    { label: 'Reggae',            slug: 'reggae'      },
    { label: 'Funk',              slug: 'funk'        },
    { label: 'Latin',             slug: 'latin'       },
    { label: 'Afrobeats',         slug: 'afrobeats'   },
    { label: 'Blues',             slug: 'blues'       },
    { label: 'Bande originale',   slug: 'soundtrack'  },
] as const;

export type GenreSlug = typeof GENRE_FAMILIES[number]['slug'];
