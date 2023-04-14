import express, { Request, Response, NextFunction } from "express";
import { body, header } from "express-validator";
import { User } from "../models/User";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
export const saltRounds = 10;
const jwtToken = "shhhhhhh";
const router = express.Router();
import { v4 } from "uuid";
import { checkErrors } from "./utils";

export const isAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const auth = req.headers.authorization as string;
  const user = jwt.verify(auth, jwtToken) as { id: string };
  res.locals.userFinded = await User.findById(user.id);
  if (res.locals.userFinded) {
    return next();
  } else {
    return res.status(400).json({ message: "token not valid" });
  }
};

router.post(
  "/signup",
  body("email").isEmail(),
  body("name").notEmpty(),
  body("surname").notEmpty(),
  body("password").isLength({ min: 8 }).notEmpty(),
  checkErrors,
  async (req, res) => {
    try {
      const { name, surname, email, password } = req.body;
      const user = new User({
        name,
        surname,
        email,
        password: await bcrypt.hash(password, saltRounds),
        verify: v4(),
      });
      const response = await user.save();
      res.status(201).json({
        name: user.name,
        id: response._id,
        surname: user.surname,
        email: user.email,
      });
    } catch (err) {
      return res.status(409).json({ message: "Email is just present" });
    }
  }
);
router.get("/validate/:tokenVerify", async (req, res) => {
  const user = await User.findOne({ verify: req.params.tokenVerify });
  if (user) {
    user.verify = undefined;
    await user.save();
    res.json({ message: "User enabled" });
  } else {
    res.status(400).json({ message: "token not valid" });
  }
});
router.post(
  "/login",
  body("email").isEmail(),
  body("password").isLength({ min: 8 }).notEmpty(),
  checkErrors,
  async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    if (
      user &&
      !user.verify &&
      (await bcrypt.compare(req.body.password, user.password!))
    ) {
      const token = jwt.sign(
        {
          id: user._id,
          email: user.email,
          name: user.name,
          surname: user.surname,
        },
        jwtToken
      );
      return res.json({ token });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  }
);
router.get(
  "/me",
  header("authorization").isJWT(),
  checkErrors,
  isAuth,
  async (_, res) => {
    const userFinded = res.locals.userFinded;
    res.json({
      id: userFinded._id,
      name: userFinded.name,
      surname: userFinded.surname,
      email: userFinded.email,
    });
  }
);

export default router;
