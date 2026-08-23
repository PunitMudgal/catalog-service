import { Hono } from "hono";
import { authenticateAccessToken } from "../middleware/authenticate.js";
import { requireRoles } from "../middleware/require-roles.js";
import { VariantController } from "./variant.controller.js";

export const variantRouter = new Hono();
const controller = new VariantController();
const manageVariants = requireRoles("admin", "manager");

variantRouter.post(
  "/products/:productId/variants",
  authenticateAccessToken,
  manageVariants,
  controller.create,
);
variantRouter.patch(
  "/variants/:id",
  authenticateAccessToken,
  manageVariants,
  controller.update,
);
variantRouter.patch(
  "/variants/:id/availability",
  authenticateAccessToken,
  requireRoles("admin", "manager", "staff"),
  controller.setAvailability,
);
variantRouter.delete(
  "/variants/:id",
  authenticateAccessToken,
  requireRoles("admin"),
  controller.remove,
);

export default variantRouter;
