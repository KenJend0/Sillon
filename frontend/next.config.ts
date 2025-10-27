// next.config.ts
export default {
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'http://localhost:4000/:path*'
            }
        ];
    },
    images: {
        domains: [
            "coverartarchive.org",  // ✅ pour tes pochettes d'albums
            "is1-ssl.mzstatic.com", // (exemple : Apple Music)
            "lastfm.freetls.fastly.net", // (exemple : Last.fm)
            "i.scdn.co", // (Spotify)
            "lh3.googleusercontent.com",
            "res.cloudinary.com", // (si tu héberges des images)
        ],
    }

};
