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

app.post(
  "/signup"
  /* YOUR CODE HERE */
);
app.get(
  "/validate/:tokenVerify"
  /* YOUR CODE HERE */
);
app.post(
  "/login"
  /* YOUR CODE HERE */
);
app.get(
  "/me"
  /* YOUR CODE HERE */
);

app.listen(3001, async () => {
  await fs.writeFile("db.json", JSON.stringify([]));
  users = JSON.parse(await fs.readFile("db.json", "binary"));
  console.log("Server is running");
});

export default app;
