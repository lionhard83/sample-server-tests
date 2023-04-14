import request from "supertest";
require("chai").should();
import { app } from "../app";
import { Product } from "../models/Product";
import bcrypt from "bcrypt";
import { User as UserSchema } from "../models/User";
import { saltRounds } from "../routes/auth";
import jwt from "jsonwebtoken";
const jwtToken = "shhhhhhh";

const basicUrl = "/v1/products";

describe.only("products", () => {
  const product = {
    name: "iphone14",
    brand: "apple",
    price: 1200,
  };
  const user = {
    name: "Carlo",
    surname: "Leonardi",
    email: "carloleonard83@gmail.com",
    password: "testtest",
  };
  let token: string;
  before(async () => {
    const userCreated = new UserSchema({
      name: user.name,
      surname: user.surname,
      email: user.email,
      password: await bcrypt.hash(user.password, saltRounds),
    });
    await userCreated.save();
    token = jwt.sign(
      {
        id: userCreated._id,
        email: userCreated.email,
        name: userCreated.name,
        surname: userCreated.surname,
      },
      jwtToken
    );
    console.log("token:", token);
  });
  after(async () => {
    await UserSchema.findOneAndDelete({ email: user.email });
  });

  describe("create product", () => {
    let id: string;
    after(async () => {
      await Product.findByIdAndDelete(id);
    });
    it("failed test 401", async () => {
      const { status } = await request(app).post(basicUrl).send(product);
      status.should.be.equal(401);
    });
    it("success test 201", async () => {
      const { status, body } = await request(app)
        .post(basicUrl)
        .send(product)
        .set({ authorization: token });
      status.should.be.equal(201);
      body.should.have.property("_id");
      body.should.have.property("name").equal(product.name);
      body.should.have.property("brand").equal(product.brand);
      body.should.have.property("price").equal(product.price);
      id = body._id;
    });
  });

  describe("update product", () => {
    let id: string;
    const newBrand = "google";
    before(async () => {
      const p = await Product.create(product);
      id = p._id.toString();
    });
    after(async () => {
      await Product.findByIdAndDelete(id);
    });
    it("test failed 401", async () => {
      const { status } = await request(app)
        .put(`${basicUrl}/${id}`)
        .send({ ...product, brand: newBrand });
      status.should.be.equal(401);
    });
    it("test success 200", async () => {
      const { status, body } = await request(app)
        .put(`${basicUrl}/${id}`)
        .send({ ...product, brand: newBrand })
        .set({ authorization: token });
      status.should.be.equal(200);
      body.should.have.property("_id");
      body.should.have.property("name").equal(product.name);
      body.should.have.property("brand").equal(newBrand);
      body.should.have.property("price").equal(product.price);
    });

    it("test unsuccess 404 not valid mongoId", async () => {
      const fakeId = "a" + id.substring(1);
      const { status } = await request(app)
        .put(`${basicUrl}/${fakeId}`)
        .send({ ...product, brand: newBrand })
        .set({ authorization: token });
      status.should.be.equal(404);
    });

    it("test unsuccess 400 missing brand", async () => {
      const fakeProduct = { ...product } as any;
      delete fakeProduct.brand;
      const { status } = await request(app)
        .put(`${basicUrl}/${id}`)
        .send(fakeProduct)
        .set({ authorization: token });
      status.should.be.equal(400);
    });

    it("test unsuccess 400 price not number", async () => {
      const fakeProduct = { ...product } as any;
      fakeProduct.price = "pippo";
      const { status } = await request(app)
        .put(`${basicUrl}/${id}`)
        .send(fakeProduct)
        .set({ authorization: token });
      status.should.be.equal(400);
    });
  });

  describe("delete product", () => {
    let id: string;
    before(async () => {
      const p = await Product.create(product);
      id = p._id.toString();
    });
    it("test failed 401", async () => {
      const { status } = await request(app).delete(`${basicUrl}/${id}`);
      status.should.be.equal(401);
    });
    it("test success 200", async () => {
      const { status } = await request(app)
        .delete(`${basicUrl}/${id}`)
        .set({ authorization: token });
      status.should.be.equal(200);
    });
  });

  describe("get product", () => {
    let id: string;
    before(async () => {
      const p = await Product.create(product);
      id = p._id.toString();
    });
    after(async () => {
      await Product.findByIdAndDelete(id);
    });
    it("test success 200", async () => {
      const { status, body } = await request(app).get(`${basicUrl}/${id}`);
      status.should.be.equal(200);
      body.should.have.property("_id").equal(id);
      body.should.have.property("name").equal(product.name);
      body.should.have.property("brand").equal(product.brand);
      body.should.have.property("price").equal(product.price);
    });
    it("test unsuccess 404 not valid mongoId", async () => {
      const fakeId = "a" + id.substring(1);
      const { status } = await request(app).get(`${basicUrl}/${fakeId}`);
      status.should.be.equal(404);
    });
  });

  describe("get products", () => {
    let ids: string[] = [];
    const products = [
      {
        name: "iphone14",
        brand: "apple",
        price: 1200,
      },
      {
        name: "s22",
        brand: "samsung",
        price: 100,
      },
      {
        name: "s22",
        brand: "motorola",
        price: 300,
      },
    ];
    before(async () => {
      const response = await Promise.all([
        Product.create(products[0]),
        Product.create(products[1]),
        Product.create(products[2]),
      ]);
      ids = response.map((item) => item._id.toString());
    });
    after(async () => {
      await Promise.all([
        Product.findByIdAndDelete(ids[0]),
        Product.findByIdAndDelete(ids[1]),
        Product.findByIdAndDelete(ids[2]),
      ]);
    });

    it("test success 200", async () => {
      const { status, body } = await request(app).get(basicUrl);
      status.should.be.equal(200);
      body.should.have.property("length").equal(products.length);
    });

    it("test success 200 with query params", async () => {
      const { status, body } = await request(app).get(
        `${basicUrl}?brand=apple`
      );
      status.should.be.equal(200);
      body.should.have.property("length").equal(1);
    });
  });
});
