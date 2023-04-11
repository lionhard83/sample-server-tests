import express, { NextFunction, Response, Request } from "express";
import { body, header, validationResult } from "express-validator";
import { promises as fs } from "fs";
import { v4 } from "uuid";
export const app = express();
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const jwtToken = "shhhhhhh";
export const saltRounds = 10;
import mongoose from "mongoose";
import { User } from "./models/User";

app.use(express.json());

export type User = {
  id: string;
  name: string;
  surname: string;
  email: string;
  password?: string;
  verify?: string;
};

export let users: User[] = [];

const checkErrors = (req: Request, res: Response, next: NextFunction) => {
  // Finds the validation errors in this request and wraps them in an object with handy functions
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

app.post(
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
app.get("/validate/:tokenVerify", async (req, res) => {
  const user = await User.findOne({ verify: req.params.tokenVerify });
  if (user) {
    user.verify = undefined;
    await user.save();
    res.json({ message: "User enabled" });
  } else {
    res.status(400).json({ message: "token not valid" });
  }
});
app.post(
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
app.get(
  "/me",
  header("authorization").isJWT(),
  checkErrors,
  async (req, res) => {
    const auth = req.headers.authorization as string;
    const user = jwt.verify(auth, jwtToken) as User;
    const userFinded = await User.findById(user.id);
    if (userFinded) {
      res.json({
        id: userFinded._id,
        name: userFinded.name,
        surname: userFinded.surname,
        email: userFinded.email,
      });
    } else {
      res.status(400).json({ message: "token not valid" });
    }
  }
);

app.listen(process.env.PORT || 3001, async () => {
  await fs.writeFile(String(process.env.DB), JSON.stringify([]));
  users = JSON.parse(await fs.readFile(String(process.env.DB), "binary"));
  console.log("Server is running");
  await mongoose.connect(`mongodb://127.0.0.1:27017/${process.env.DB}`);
});

export default app;
