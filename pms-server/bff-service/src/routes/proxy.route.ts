import { Router, Request, Response } from 'express';
import axios, { AxiosError } from 'axios';
import { getSession, refreshSession } from '../session/store';
import { logger } from '../logger/logger';
import { TOKEN_URL, CLIENT_ID, CLIENT_SECRET } from './auth.route';

const router = Router();

const ADMIN_URL      = process.env['ADMIN_SERVICE_URL']!;      // http://admin-service:5000
const MANAGEMENT_URL = process.env['MANAGEMENT_SERVICE_URL']!; // http://management-service:5001

// ── Middleware: resolve session → attach token to req ─────────
async function requireSession(req: Request, res: Response, next: () => void) {
    const sessionId = req.cookies['pms_session'];
    if (!sessionId) return res.status(401).json({ error: 'No session' });

    let session = await getSession(sessionId);
    if (!session) {
        res.clearCookie('pms_session');
        return res.status(401).json({ error: 'Session expired' });
    }

    // Silently refresh the access token if it is about to expire
    if (Date.now() >= session.expiresAt) {
        try {
            const tokenRes = await axios.post(
                TOKEN_URL,
                new URLSearchParams({
                    grant_type:    'refresh_token',
                    client_id:     CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    refresh_token: session.refreshToken,
                }),
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );
            const { access_token, refresh_token, expires_in } = tokenRes.data;
            session = {
                ...session,
                accessToken:  access_token,
                refreshToken: refresh_token,
                expiresAt:    Date.now() + (expires_in - 30) * 1000,
            };
            await refreshSession(sessionId, session);
            logger.info('Access token silently refreshed');
        } catch (err) {
            await import('../session/store').then(m => m.deleteSession(sessionId));
            res.clearCookie('pms_session');
            return res.status(401).json({ error: 'Session expired, please log in again' });
        }
    }

    req.accessToken = session.accessToken;
    next();
}

// Extend Express Request to carry the resolved token
declare global {
    namespace Express {
        interface Request {
            accessToken?: string;
        }
    }
}

// ── Generic proxy helper ──────────────────────────────────────
async function proxyRequest(
    req: Request,
    res: Response,
    targetBase: string,
    targetPath: string
) {
    try {
        const upstream = await axios({
            method:  req.method as any,
            url:     `${targetBase}${targetPath}`,
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${req.accessToken}`,
            },
            data:    ['POST', 'PUT', 'PATCH'].includes(req.method) ? req.body : undefined,
            params:  req.query,
            validateStatus: () => true, // let BFF forward any status code
        });
        res.status(upstream.status).json(upstream.data);
    } catch (err) {
        const axiosErr = err as AxiosError;
        logger.error({ err: axiosErr.message, targetBase, targetPath }, 'Proxy request failed');
        res.status(502).json({ error: 'Upstream service unavailable' });
    }
}

// ── /bff/admin/* → admin-service:/admin/* ────────────────────
router.all('/admin', requireSession, (req, res) =>
    proxyRequest(req, res, ADMIN_URL, '/admin')
);
router.all('/admin/:id', requireSession, (req, res) =>
    proxyRequest(req, res, ADMIN_URL, `/admin/${req.params['id']}`)
);

// ── /bff/management/* → management-service:/management/* ─────
router.all('/management', requireSession, (req, res) =>
    proxyRequest(req, res, MANAGEMENT_URL, '/management')
);
router.all('/management/:id', requireSession, (req, res) =>
    proxyRequest(req, res, MANAGEMENT_URL, `/management/${req.params['id']}`)
);

export { router as proxyRouter };
