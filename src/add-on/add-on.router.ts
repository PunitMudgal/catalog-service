import { Hono } from "hono";
import { authenticateAccessToken } from "../middleware/authenticate.js";
import { requireRoles } from "../middleware/require-roles.js";
import { AddOnController } from "./add-on.controller.js";

export const addOnRouter = new Hono();
const controller = new AddOnController();
const manageAddOns = requireRoles("admin", "manager");

addOnRouter.get("/add-ons", authenticateAccessToken, manageAddOns, controller.list);
addOnRouter.post("/add-ons", authenticateAccessToken, manageAddOns, controller.create);
addOnRouter.patch("/add-ons/:id", authenticateAccessToken, manageAddOns, controller.update);
addOnRouter.delete(
  "/add-ons/:id",
  authenticateAccessToken,
  requireRoles("admin"),
  controller.remove,
);
addOnRouter.post(
  "/products/:productId/add-ons/:addOnId",
  authenticateAccessToken,
  manageAddOns,
  controller.attach,
);
addOnRouter.delete(
  "/products/:productId/add-ons/:addOnId",
  authenticateAccessToken,
  manageAddOns,
  controller.detach,
);

export default addOnRouter;
