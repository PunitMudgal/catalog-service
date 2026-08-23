import { Hono } from "hono";
import { authenticateAccessToken } from "../middleware/authenticate.js";
import { requireRoles } from "../middleware/require-roles.js";
import { AddOnController } from "./add-on.controller.js";

export const addOnRouter = new Hono();
const controller = new AddOnController();
const manageAddOns = requireRoles("admin", "manager");

addOnRouter.use("*", authenticateAccessToken);
addOnRouter.get("/add-ons", manageAddOns, controller.list);
addOnRouter.post("/add-ons", manageAddOns, controller.create);
addOnRouter.patch("/add-ons/:id", manageAddOns, controller.update);
addOnRouter.delete("/add-ons/:id", requireRoles("admin"), controller.remove);
addOnRouter.post(
  "/products/:productId/add-ons/:addOnId",
  manageAddOns,
  controller.attach,
);
addOnRouter.delete(
  "/products/:productId/add-ons/:addOnId",
  manageAddOns,
  controller.detach,
);

export default addOnRouter;
