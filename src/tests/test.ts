import request from "supertest";
require("chai").should();
import bcrypt from "bcrypt";
import { app, users, User, saltRounds } from "../app";
import { v4 } from "uuid";

describe("endpoints", () => {
  const user = {
    name: "Carlo",
    surname: "Leonardi",
    email: "carloleonard83@gmail.com",
    password: "testtest",
  };
  describe("signup", () => {
    after(() => {
      const index = users.findIndex(({ email }) => email === user.email);
      users.splice(index, 1);
    });
    it("test 400 wrong email", async () => {
      const { status } = await request(app)
        .post("/signup")
        .send({ ...user, email: "wrong-email" });
      status.should.be.equal(400);
    });

    it("test 400 missing name", async () => {
      const userWithoutName = { ...user } as any;
      delete userWithoutName.name;
      const { status } = await request(app)
        .post("/signup")
        .send(userWithoutName);
      status.should.be.equal(400);
    });
    it("test 400 short password", async () => {
      const userWithShortPassword = { ...user } as any;
      userWithShortPassword.password = "aaa";
      const { status } = await request(app)
        .post("/signup")
        .send(userWithShortPassword);
      status.should.be.equal(400);
    });
    it("test 201 for signup", async () => {
      const { body, status } = await request(app).post("/signup").send(user);
      status.should.be.equal(201);
      body.should.have.property("id");
      body.should.have.property("name").equal(user.name);
      body.should.have.property("surname").equal(user.surname);
      body.should.have.property("email").equal(user.email);
      body.should.not.have.property("password");
      body.should.not.have.property("verify");
    });
    it("test 409 email is just present", async () => {
      const { status } = await request(app).post("/signup").send(user);
      status.should.be.equal(409);
    });
  });

  describe("validate", () => {
    let newUser: User;
    before(() => {
      newUser = {
        id: v4(),
        name: "Carlo",
        surname: "Leonardi",
        email: "carloleonardi83@gmail.com",
        password: "cript-password",
        verify: v4(),
      };
      users.push(newUser);
    });
    after(() => {
      const index = users.findIndex(({ email }) => email === user.email);
      users.splice(index, 1);
    });
    it("test 400 Invalid token", async () => {
      const { status } = await request(app).get(`/validate/fake-token`);
      status.should.be.equal(400);
    });
    it("test 200 set token", async () => {
      const { status } = await request(app).get(`/validate/${newUser.verify}`);
      status.should.be.equal(200);
      const userFinded = users.find(({ email }) => email === newUser.email);
      userFinded!.should.not.have.property("verify");
    });
  });

  describe("login", () => {
    let newUser: User;
    let password = "password";
    before(async () => {
      newUser = {
        id: v4(),
        name: "Carlo",
        surname: "Leonardi",
        email: "carloleonardi83@gmail.com",
        password: await bcrypt.hash(password, saltRounds),
      };
      users.push(newUser);
    });
    after(() => {
      const index = users.findIndex(({ email }) => email === user.email);
      users.splice(index, 1);
    });
    it("test 400 wrong data", async () => {
      const { status } = await request(app)
        .post(`/login`)
        .send({ email: "wrongmail", password: "A simple password" });
      status.should.be.equal(400);
    });
    it("test 401 invalid credentials", async () => {
      const { status } = await request(app)
        .post(`/login`)
        .send({ email: newUser.email, password: "wrong-password" });
      status.should.be.equal(401);
    });
    it("test 200 login success", async () => {
      const { status, body } = await request(app)
        .post(`/login`)
        .send({ email: newUser.email, password });
      status.should.be.equal(200);
      body.should.have.property("token");
    });
  });

  describe("login with not confirmed user", () => {
    let newUser: User;
    let password = "password";
    before(async () => {
      newUser = {
        id: v4(),
        name: "Carlo",
        surname: "Leonardi",
        email: "carloleonardi83@gmail.com",
        password: await bcrypt.hash(password, saltRounds),
        verify: v4(),
      };
      users.push(newUser);
    });
    after(() => {
      const index = users.findIndex(({ email }) => email === user.email);
      users.splice(index, 1);
    });
    it("test 401 login not success (while email is not verified)", async () => {
      const { status } = await request(app)
        .post(`/login`)
        .send({ email: newUser.email, password });
      status.should.be.equal(401);
    });
  });

  describe("me", () => {
    let newUser: User;
    let password = "password";
    before(async () => {
      newUser = {
        id: v4(),
        name: "Carlo",
        surname: "Leonardi",
        email: "carloleonardi83@gmail.com",
        password: await bcrypt.hash(password, saltRounds),
      };
      users.push(newUser);
    });
    after(() => {
      const index = users.findIndex(({ email }) => email === user.email);
      users.splice(index, 1);
    });
    it("test 200 token wrong", async () => {
      const { status } = await request(app)
        .get(`/me`)
        .set({ authorization: "wrong-token" });
      status.should.be.equal(400);
    });
    it("test 200 token rigth", async () => {
      const {
        body: { token },
      } = await request(app)
        .post(`/login`)
        .send({ email: newUser.email, password });

      const { body } = await request(app)
        .get("/me")
        .set({ authorization: token });
      body.should.have.property("id");
      body.should.have.property("name").equal(newUser.name);
      body.should.have.property("surname").equal(newUser.surname);
      body.should.have.property("email").equal(newUser.email);
      body.should.not.have.property("password");
      body.should.not.have.property("verify");
    });
  });
});
