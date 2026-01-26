import { NextFunction, Request, RequestHandler, Response } from 'express';

const getUser: RequestHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // if (!req.user) {
    //     // next(new ApiError(403));
    //     return;
    // }
    try {
        const data = [{
            "Admin":"Ashwath", 
            "info": req.user
        }];
        res.json(data);
    } catch (error: any) {
        next();
    }
    return;
};


export default {
    getUser
};
