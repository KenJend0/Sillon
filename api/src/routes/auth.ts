import { Router } from "express";
import { Issuer, generators, Client } from "openid-client";
import { pool } from "../db";

const router = Router();

let googleClientPromise: Promise<Client> | null = null;
async function getGoogleClient() {
    if (!googleClientPromise) {
        googleClientPromise = (async () => {
            const google = await Issuer.discover("https://accounts.google.com");
            const client = new google.Client({
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                redirect_uris: [process.env.OAUTH_REDIRECT_URI!],
                response_types: ["code"],
            });
            return client;
        })();
    }
    return googleClientPromise;
}

// Démarrage login Google
router.get("/google", async (req, res) => {
    try {
        const client = await getGoogleClient();
        const state = generators.state();
        const code_verifier = generators.codeVerifier();
        const code_challenge = generators.codeChallenge(code_verifier);

        (req.session as any).oauth = { state, code_verifier, provider: "google" };

        // ⚠️ On force la sauvegarde de la session avant de redirect
        req.session.save((err) => {
            if (err) {
                console.error("Failed to save session before redirect", err);
                return res.status(500).send("session_error");
            }
            const url = client.authorizationUrl({
                scope: "openid email profile",
                state,
                code_challenge,
                code_challenge_method: "S256",
            });
            res.redirect(url);
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "oauth_start_failed" });
    }
});

// Callback Google
router.get("/google/callback", async (req, res) => {
    try {
        const client = await getGoogleClient();
        const { oauth } = (req.session as any) || {};
        if (!oauth || oauth.provider !== "google")
            return res.status(400).send("Invalid session");

        const params = client.callbackParams(req);
        if (!params.state || params.state !== oauth.state)
            return res.status(400).send("Invalid state");

        const tokenSet = await client.callback(
            process.env.OAUTH_REDIRECT_URI!,
            params,
            { code_verifier: oauth.code_verifier, state: oauth.state }
        );

        const userinfo = await client.userinfo(tokenSet.access_token!);
        const email = (userinfo as any).email as string | undefined;
        const name = (userinfo as any).name as string | undefined;
        const picture = (userinfo as any).picture as string | undefined;
        if (!email) return res.status(400).send("No email");
        const base = email.split("@")[0];
        const defaultUsername = base
            .replace(/[^a-zA-Z0-9_]/g, "")
            .slice(0, 20);

        const { rows } = await pool.query(
            `INSERT INTO users (email, display_name, picture_url, username)
             VALUES ($1, $2, $3, $4)
                 ON CONFLICT (email) DO UPDATE
                                            SET display_name = COALESCE(EXCLUDED.display_name, users.display_name),
                                            picture_url  = COALESCE(EXCLUDED.picture_url,  users.picture_url)
                                            RETURNING id, email, display_name, picture_url, username`,
            [email, name ?? null, picture ?? null, defaultUsername]
        );
        const user = rows[0];

        (req.session as any).user = {
            id: user.id,
            email: user.email,
            display_name: user.display_name,
            picture_url: user.picture_url,
            provider: "google",
        };
        (req.session as any).oauth = undefined;

        const redirect = process.env.POST_LOGIN_REDIRECT || "http://localhost:3000";
        res.redirect(redirect);
    } catch (e) {
        console.error(e);
        res.status(500).send("oauth_callback_failed");
    }
});

// Déconnexion
router.post("/logout", (req, res) => {
    req.session.destroy(() => {
        res.json({ ok: true });
    });
});

// Infos utilisateur
router.get("/me", async (req, res) => {
    const sessUser = (req.session as any).user;
    if (!sessUser) return res.status(401).json({ error: "unauthorized" });

    try {
        const { rows } = await pool.query(
            `SELECT id, email, username, display_name, picture_url
             FROM users
             WHERE id = $1`,
            [sessUser.id]
        );

        if (!rows[0]) return res.status(404).json({ error: "not_found" });

        res.json({ user: rows[0] });
    } catch (err) {
        console.error("Error in /auth/me", err);
        res.status(500).json({ error: "server_error" });
    }
});

export default router;
