import { Hono } from "hono";
import { CategoryController } from "../category/category.controller.js";
import { ProductController } from "../product/product.controller.js";
import { AddOnController } from "../add-on/add-on.controller.js";
import { VariantController } from "../variant/variant.controller.js";

export const publicRouter = new Hono();

const categoryController = new CategoryController();
const productController = new ProductController();
const addOnController = new AddOnController();
const variantController = new VariantController();

// Categories
publicRouter.get("/categories", categoryController.publicList);
publicRouter.get("/categories/:id", categoryController.publicGetById);

// Products
publicRouter.get("/products", productController.publicList);
// Product get-by-id is already served by the menu router: GET /:tenantId/products/:productId

// Add-ons
publicRouter.get("/add-ons", addOnController.publicList);
publicRouter.get("/add-ons/:id", addOnController.publicGetById);

// Variants
publicRouter.get("/variants", variantController.publicList);
publicRouter.get("/variants/:id", variantController.publicGetById);

export default publicRouter;
