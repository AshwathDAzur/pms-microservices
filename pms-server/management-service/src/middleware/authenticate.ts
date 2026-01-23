import {  Request, RequestHandler, Response } from 'express';
import jwtmod from 'jsonwebtoken';

declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

const authenticate: RequestHandler = async (
    req: Request,
    res: Response,
    next
) => {
    const bearerHeader = req.headers['authorization'];
    const token = bearerHeader && bearerHeader.split(' ')[1];
    if (!token) {
        return res.sendStatus(401);
    }

    try {
        const publicKey = `-----BEGIN PUBLIC KEY-----\n${process.env.PUBLICKEY}\n-----END PUBLIC KEY-----`;
        const decodedToken = jwtmod.verify(token, publicKey, { algorithms: ['RS256'] });
        // console.log("Token verified:", decodedToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Token verification failed:", errorMessage);
        return res.status(401).json({ error: 'Invalid token' });
    }
};


export { authenticate };
