import jwtmod from 'jsonwebtoken';

export default async (req, res, next) => {
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
        console.error("Token verification failed:", error.message);
        return res.status(401).json({ error: 'Invalid token' });
    }
};
