import { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

export const asyncHandler = (fn: AsyncRequestHandler): RequestHandler => (
  req: Request, res: Response, next: NextFunction
) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};


