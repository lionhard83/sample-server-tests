import express, { NextFunction, Response, Request } from "express";
import { body, header, validationResult } from "express-validator";
import { promises as fs } from "fs";
import { v4 } from "uuid";
export const app = express();
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const jwtToken = "shhhhhhh";
export const saltRounds = 10;

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
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const checkEmail = (req: Request, res: Response, next: NextFunction) => {
  if (users.find((item) => item.email === req.body.email)) {
    return res.status(409).json({ message: "email is present" });
  }
  next();
};

app.post(
  "/signup",
  body("email").isEmail(),
  body("name").isString(),
  body("surname").isString(),
  body("password").isLength({ min: 5 }),
  checkErrors,
  checkEmail,
  async (req, res) => {
    const user: User = {
      id: v4(),
      email: req.body.email,
      name: req.body.name,
      surname: req.body.surname,
      password: await bcrypt.hash(req.body.password!, saltRounds),
      verify: v4(),
    };
    users.push(user);
    fs.writeFile("db.json", JSON.stringify(users));
    delete user.password;
    delete user.verify;
    res.status(201).json(user);
  }
);
app.get("/validate/:tokenVerify", (req, res) => {
  const user = users.find(({ verify }) => verify === req.params.tokenVerify);
  if (user) {
    delete user?.verify;
    res.status(200).json({ message: "validate user" });
  } else {
    res.status(400).json({ message: "Invalid token" });
  }
});
app.post(
  "/login",
  body("email").isEmail(),
  body("password").isLength({ min: 5 }),
  checkErrors,
  async (req, res) => {
    const user = users.find(
      ({ email, verify }) => email === req.body.email && !verify
    );
    if (
      user &&
      (await bcrypt.compare(req.body.password, user.password as string))
    ) {
      return res.json({ token: jwt.sign(user, jwtToken) });
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
    const user = (await jwt.verify(
      req.headers.authorization as string,
      jwtToken
    )) as User;
    if (user) {
      delete user.password;
      res.json(user);
    } else {
      res.status(401).json({ message: "Invalid token" });
    }
  }
);

app.listen(3001, async () => {
  await fs.writeFile("db.json", JSON.stringify([]));
  users = JSON.parse(await fs.readFile("db.json", "binary"));
  console.log("Server is running");
});

export default app;
