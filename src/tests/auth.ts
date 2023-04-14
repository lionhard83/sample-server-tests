import request from "supertest";
require("chai").should();
import bcrypt from "bcrypt";
import { app } from "../app";
import { v4 } from "uuid";
import { User as UserSchema } from "../models/User";
import { assert } from "chai";
import { saltRounds } from "../routes/auth";

const baseAuth = "/v1/auth";

describe("auth", () => {
  const user = {
    name: "Carlo",
    surname: "Leonardi",
    email: "carloleonard83@gmail.com",
    password: "testtest",
  };
  describe("signup", () => {
    after(async () => {
      await UserSchema.findOneAndDelete({ email: user.email });
    });
    it("test 400 wrong email", async () => {
      const { status } = await request(app)
        .post(`${baseAuth}/signup`)
        .send({ ...user, email: "wrong-email" });
      status.should.be.equal(400);
    });

    it("test 400 missing name", async () => {
      const userWithoutName = { ...user } as any;
      delete userWithoutName.name;
      const { status } = await request(app)
        .post(`${baseAuth}/signup`)
        .send(userWithoutName);
      status.should.be.equal(400);
    });
    it("test 400 short password", async () => {
      const userWithShortPassword = { ...user } as any;
      userWithShortPassword.password = "aaa";
      const { status } = await request(app)
        .post(`${baseAuth}/signup`)
        .send(userWithShortPassword);
      status.should.be.equal(400);
    });
    it("test 201 for signup", async () => {
      const { body, status } = await request(app)
        .post(`${baseAuth}/signup`)
        .send(user);
      status.should.be.equal(201);
      body.should.have.property("id");
      body.should.have.property("name").equal(user.name);
      body.should.have.property("surname").equal(user.surname);
      body.should.have.property("email").equal(user.email);
      body.should.not.have.property("password");
      body.should.not.have.property("verify");
    });
    it("test 409 email is just present", async () => {
      const { status } = await request(app)
        .post(`${baseAuth}/signup`)
        .send(user);
      status.should.be.equal(409);
    });
  });

  describe("validate", async () => {
    const verify = v4();
    before(async () => {
      const userCreated = new UserSchema({
        name: user.name,
        surname: user.surname,
        email: user.email,
        password: user.password,
        verify,
      });
      await userCreated.save();
    });
    after(async () => {
      await UserSchema.findOneAndDelete({ email: user.email });
    });
    it("test 400 Invalid token", async () => {
      const { status } = await request(app).get(
        `${baseAuth}/validate/fake-token`
      );
      status.should.be.equal(400);
    });
    it("test 200 set token", async () => {
      const { status } = await request(app).get(
        `${baseAuth}/validate/${verify}`
      );
      status.should.be.equal(200);
      const userFinded = await UserSchema.findOne({ email: user.email });
      assert.equal(userFinded!.verify, undefined);
    });
  });

  describe("login", () => {
    before(async () => {
      const userCreated = new UserSchema({
        name: user.name,
        surname: user.surname,
        email: user.email,
        password: await bcrypt.hash(user.password, saltRounds),
      });
      await userCreated.save();
    });
    after(async () => {
      await UserSchema.findOneAndDelete({ email: user.email });
    });

    it("test 400 wrong data", async () => {
      const { status } = await request(app)
        .post(`${baseAuth}/login`)
        .send({ email: "wrongmail", password: "A simple password" });
      status.should.be.equal(400);
    });
    it("test 401 invalid credentials", async () => {
      const { status } = await request(app)
        .post(`${baseAuth}/login`)
        .send({ email: user.email, password: "wrong-password" });
      status.should.be.equal(401);
    });
    it("test 200 login success", async () => {
      const { status, body } = await request(app)
        .post(`${baseAuth}/login`)
        .send({ email: user.email, password: user.password });
      status.should.be.equal(200);
      body.should.have.property("token");
    });
  });

  describe("login with not confirmed user", () => {
    before(async () => {
      const userCreated = new UserSchema({
        name: user.name,
        surname: user.surname,
        email: user.email,
        password: await bcrypt.hash(user.password, saltRounds),
        verify: v4(),
      });
      await userCreated.save();
    });
    after(async () => {
      await UserSchema.findOneAndDelete({ email: user.email });
    });
    it("test 401 login not success (while email is not verified)", async () => {
      const { status } = await request(app)
        .post(`${baseAuth}/login`)
        .send({ email: user.email, password: user.password });
      status.should.be.equal(401);
    });
  });

  describe("me", () => {
    before(async () => {
      const userCreated = new UserSchema({
        name: user.name,
        surname: user.surname,
        email: user.email,
        password: await bcrypt.hash(user.password, saltRounds),
      });
      await userCreated.save();
    });
    after(async () => {
      await UserSchema.findOneAndDelete({ email: user.email });
    });
    it("test 200 token wrong", async () => {
      const { status } = await request(app)
        .get(`${baseAuth}/me`)
        .set({ authorization: "wrong-token" });
      status.should.be.equal(400);
    });
    it("test 200 token rigth", async () => {
      const {
        body: { token },
      } = await request(app)
        .post(`${baseAuth}/login`)
        .send({ email: user.email, password: user.password });

      const { body } = await request(app)
        .get(`${baseAuth}/me`)
        .set({ authorization: token });
      body.should.have.property("id");
      body.should.have.property("name").equal(user.name);
      body.should.have.property("surname").equal(user.surname);
      body.should.have.property("email").equal(user.email);
      assert.equal(body!.verify, undefined);
      assert.equal(body!.password, undefined);
    });
  });
});
