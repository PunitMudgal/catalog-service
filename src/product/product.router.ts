import { Hono } from "hono";
import { authenticateAccessToken } from "../middleware/authenticate.js";
import { requireRoles } from "../middleware/require-roles.js";
import { ProductController } from "./product.controller.js";

export const productRouter = new Hono();
const controller = new ProductController();

productRouter.use("*", authenticateAccessToken);
const manageProducts = requireRoles("admin", "manager");

productRouter.get("/", manageProducts, controller.list);
productRouter.get("/:id", manageProducts, controller.getById);
productRouter.post("/", manageProducts, controller.create);
productRouter.patch("/:id", manageProducts, controller.update);
productRouter.patch(
  "/:id/availability",
  requireRoles("admin", "manager", "staff"),
  controller.setAvailability,
);
productRouter.delete("/:id", manageProducts, controller.remove);

export default productRouter;
