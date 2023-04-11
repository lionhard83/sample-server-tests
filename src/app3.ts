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
  (req, res, next) => {
    const user = users.find(({ email }) => email === req.body.email);
    if (user) {
      return res.status(409).json({ message: "Email is just present" });
    }
    next();
  },
  async (req, res) => {
    const { name, surname, email, password } = req.body;
    const user = {
      name,
      surname,
      email,
      password: await bcrypt.hash(password, saltRounds),
      id: v4(),
      verify: v4(),
    };
    users.push(user);
    await fs.writeFile(String(process.env.DB), JSON.stringify(users));
    res.status(201).json({
      name: user.name,
      id: user.id,
      surname: user.surname,
      email: user.email,
    });
  }
);
app.get("/validate/:tokenVerify", async (req, res) => {
  const user = users.find((item) => item.verify === req.params.tokenVerify);
  if (user) {
    delete user.verify;
    await fs.writeFile(String(process.env.DB), JSON.stringify(users));
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
    const user = users.find((item) => item.email === req.body.email);
    if (
      user &&
      !user.verify &&
      (await bcrypt.compare(req.body.password, user.password!))
    ) {
      res.json({ token: jwt.sign(user, jwtToken) });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  }
);
app.get("/me", header("authorization").isJWT(), checkErrors, (req, res) => {
  const auth = req.headers.authorization as string;
  const user = jwt.verify(auth, jwtToken) as User;
  if (users.find((item) => item.email === user.email)) {
    delete user.password;
    res.json(user);
  } else {
    res.status(400).json({ message: "token not valid" });
  }
});

app.listen(3001, async () => {
  await fs.writeFile(String(process.env.DB), JSON.stringify([]));
  users = JSON.parse(await fs.readFile(String(process.env.DB), "binary"));
  console.log("Server is running");
});

export default app;
