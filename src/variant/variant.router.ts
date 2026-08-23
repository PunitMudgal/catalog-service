import { Hono } from "hono";
import { authenticateAccessToken } from "../middleware/authenticate.js";
import { requireRoles } from "../middleware/require-roles.js";
import { VariantController } from "./variant.controller.js";

export const variantRouter = new Hono();
const controller = new VariantController();
const manageVariants = requireRoles("admin", "manager");

variantRouter.use("*", authenticateAccessToken);
variantRouter.post(
  "/products/:productId/variants",
  manageVariants,
  controller.create,
);
variantRouter.patch("/variants/:id", manageVariants, controller.update);
variantRouter.patch(
  "/variants/:id/availability",
  requireRoles("admin", "manager", "staff"),
  controller.setAvailability,
);
variantRouter.delete(
  "/variants/:id",
  requireRoles("admin"),
  controller.remove,
);

export default variantRouter;
