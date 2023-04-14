import express from "express";
import { body, header, param, query } from "express-validator";
import { checkErrors } from "./utils";
import { Product } from "../models/Product";
import { isAuth } from "./auth";
const router = express.Router();

router.post(
  "/",
  header("authorization").isJWT(),
  body("name").exists().isString(),
  body("brand").exists().isString(),
  body("price").exists().isNumeric(),
  checkErrors,
  isAuth,
  async (req, res) => {
    const { name, brand, price } = req.body;
    const product = new Product({ name, brand, price });
    const productSaved = await product.save();
    res.status(201).json(productSaved);
  }
);

router.put(
  "/:id",
  header("authorization").isJWT(),
  param("id").isMongoId(),
  body("name").exists().isString(),
  body("brand").exists().isString(),
  body("price").exists().isNumeric(),
  checkErrors,
  isAuth,
  async (req, res) => {
    const { id } = req.params;
    const { name, brand, price } = req.body;
    try {
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({ message: "product not found" });
      }
      product.name = name;
      product.brand = brand;
      product.price = price;
      const productSaved = await product.save();
      res.json(productSaved);
    } catch (err) {
      res.status(500).json({ err });
    }
  }
);

router.delete(
  "/:id",
  header("authorization").isJWT(),
  param("id").isMongoId(),
  checkErrors,
  isAuth,
  async (req, res) => {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "product not found" });
    }
    await Product.findByIdAndDelete(id);
    res.json({ message: "product deleted" });
  }
);

router.get("/:id", param("id").isMongoId(), checkErrors, async (req, res) => {
  const { id } = req.params;
  const product = await Product.findById(id);
  if (!product) {
    return res.status(404).json({ message: "product not found" });
  }
  res.json(product);
});

router.get(
  "/",
  query("name").optional().isString(),
  query("brand").optional().isString(),
  query("price").optional().isNumeric(),
  checkErrors,
  async (req, res) => {
    const products = await Product.find({ ...req.query });
    res.json(products);
  }
);

export default router;
