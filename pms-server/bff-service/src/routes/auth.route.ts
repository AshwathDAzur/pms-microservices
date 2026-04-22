import { Router, Request, Response } from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { setSession, getSession, deleteSession, refreshSession } from '../session/store';
import { logger } from '../logger/logger';

const router = Router();

const KC_URL        = process.env['KEYCLOAK_URL']!;        // container-to-container: http://keycloak:8080
const KC_PUBLIC_URL = process.env['KEYCLOAK_PUBLIC_URL']!; // browser-visible:        http://localhost
const REALM         = process.env['KEYCLOAK_REALM']!;
const CLIENT_ID     = process.env['KEYCLOAK_CLIENT_ID']!;
const CLIENT_SECRET = process.env['KEYCLOAK_CLIENT_SECRET']!;
const BFF_ORIGIN    = process.env['BFF_ORIGIN']!;          // http://localhost

// Server-side calls (token exchange, logout) use the internal Docker hostname
const TOKEN_URL    = `${KC_URL}/realms/${REALM}/protocol/openid-connect/token`;
const LOGOUT_URL   = `${KC_URL}/realms/${REALM}/protocol/openid-connect/logout`;
// Browser redirect uses the public hostname so the browser can actually reach it
const AUTH_URL     = `${KC_PUBLIC_URL}/realms/${REALM}/protocol/openid-connect/auth`;
const CALLBACK_URI = `${BFF_ORIGIN}/bff/callback`;

// ── GET /bff/login ────────────────────────────────────────────
// Redirects the browser to Keycloak's login page.
// state param is a CSRF nonce — we validate it in /callback.
router.get('/login', (_req: Request, res: Response) => {
    const state = uuidv4();
    res.cookie('bff_state', state, {
        httpOnly: true,
        secure: process.env['ENV'] === 'production',
        sameSite: 'lax',
        maxAge: 5 * 60 * 1000,
    });

    const params = new URLSearchParams({
        client_id:     CLIENT_ID,
        redirect_uri:  CALLBACK_URI,
        response_type: 'code',
        scope:         'openid email profile',
        state,
    });

    res.redirect(`${AUTH_URL}?${params}`);
});

// ── GET /bff/callback ─────────────────────────────────────────
// Keycloak redirects here with ?code=...&state=...
// The browser never sees the tokens — they stay server-side.
router.get('/callback', async (req: Request, res: Response) => {
    const { code, state } = req.query as { code?: string; state?: string };
    const savedState = req.cookies['bff_state'];

    if (!code || !state || state !== savedState) {
        logger.warn('OIDC callback: invalid state or missing code');
        res.clearCookie('bff_state');
        return res.redirect('/?error=auth_failed');
    }

    res.clearCookie('bff_state');

    try {
        // Exchange auth code for tokens — this happens server-to-server.
        // The browser never touches the token.
        const tokenRes = await axios.post(
            TOKEN_URL,
            new URLSearchParams({
                grant_type:    'authorization_code',
                client_id:     CLIENT_ID,
                client_secret: CLIENT_SECRET,
                redirect_uri:  CALLBACK_URI,
                code,
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const { access_token, refresh_token, expires_in } = tokenRes.data;

        // Decode the JWT payload (base64) — no need to verify here, Keycloak just issued it
        const payload = JSON.parse(
            Buffer.from(access_token.split('.')[1], 'base64url').toString()
        );

        const session = {
            accessToken:  access_token,
            refreshToken: refresh_token,
            expiresAt:    Date.now() + (expires_in - 30) * 1000, // 30s buffer
            email:        payload.email ?? '',
            roles:        payload.realm_access?.roles ?? [],
        };

        const sessionId = uuidv4();
        await setSession(sessionId, session);

        // Set opaque session cookie — HttpOnly so JS cannot read it
        res.cookie('pms_session', sessionId, {
            httpOnly: true,
            secure:   process.env['ENV'] === 'production',
            sameSite: 'strict',
            maxAge:   3600 * 1000,
        });

        logger.info({ email: session.email }, 'Session created');
        res.redirect('/');
    } catch (err) {
        logger.error({ err }, 'Token exchange failed');
        res.redirect('/?error=token_exchange_failed');
    }
});

// ── GET /bff/session ──────────────────────────────────────────
// Frontend polls this once on load to know if the user is logged in.
// Returns { isAuthenticated, email, roles } — never the token.
router.get('/session', async (req: Request, res: Response) => {
    const sessionId = req.cookies['pms_session'];
    if (!sessionId) {
        return res.json({ isAuthenticated: false });
    }

    const session = await getSession(sessionId);
    if (!session) {
        res.clearCookie('pms_session');
        return res.json({ isAuthenticated: false });
    }

    res.json({
        isAuthenticated: true,
        email: session.email,
        roles: session.roles,
    });
});

// ── POST /bff/logout ──────────────────────────────────────────
// Deletes the Redis session, clears the cookie, then redirects
// Keycloak to invalidate the SSO session too.
router.post('/logout', async (req: Request, res: Response) => {
    const sessionId = req.cookies['pms_session'];

    if (sessionId) {
        const session = await getSession(sessionId);
        if (session) {
            try {
                // Tell Keycloak to end the SSO session
                await axios.post(
                    LOGOUT_URL,
                    new URLSearchParams({
                        client_id:     CLIENT_ID,
                        client_secret: CLIENT_SECRET,
                        refresh_token: session.refreshToken,
                    }),
                    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
                );
            } catch (err) {
                logger.warn({ err }, 'Keycloak logout request failed (non-fatal)');
            }
        }
        await deleteSession(sessionId);
    }

    res.clearCookie('pms_session');
    res.json({ loggedOut: true });
});

// ── GET /bff/health ───────────────────────────────────────────
router.get('/health', (_req, res) => res.json({ service: 'bff-service', status: 'UP' }));

export { router as authRouter, getSession, refreshSession, TOKEN_URL, CLIENT_ID, CLIENT_SECRET };
