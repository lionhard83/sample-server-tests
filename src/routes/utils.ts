import { NextFunction, Response, Request } from "express";
import { validationResult } from "express-validator";

export const checkErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Finds the validation errors in this request and wraps them in an object with handy functions
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (errors.array()[0].param === "authorization") {
      return res.status(401).json({ errors: errors.array() });
    }
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};
