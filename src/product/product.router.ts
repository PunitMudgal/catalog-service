import { Hono } from "hono";
import { authenticateAccessToken } from "../middleware/authenticate.js";
import { requireRoles } from "../middleware/require-roles.js";
import { ProductController } from "./product.controller.js";

export const productRouter = new Hono();
const controller = new ProductController();

const manageProducts = requireRoles("admin", "manager");

productRouter.get("/", authenticateAccessToken, manageProducts, controller.list);
productRouter.get("/:id", authenticateAccessToken, manageProducts, controller.getById);
productRouter.post("/", authenticateAccessToken, manageProducts, controller.create);
productRouter.patch("/:id", authenticateAccessToken, manageProducts, controller.update);
productRouter.patch(
  "/:id/availability",
  authenticateAccessToken,
  requireRoles("admin", "manager", "staff"),
  controller.setAvailability,
);
productRouter.delete(
  "/:id",
  authenticateAccessToken,
  manageProducts,
  controller.remove,
);

export default productRouter;
