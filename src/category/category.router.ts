import { Hono } from "hono";
import { CategoryController } from "./category.controller.js";
import { authenticateAccessToken } from "../middleware/authenticate.js";
import { requireRoles } from "../middleware/require-roles.js";

export const categoryRouter = new Hono();
const controller = new CategoryController();

const manageCategories = requireRoles("admin", "manager");

categoryRouter.get("/", authenticateAccessToken, manageCategories, controller.list);
categoryRouter.get("/:id", authenticateAccessToken, manageCategories, controller.getById);
categoryRouter.post("/", authenticateAccessToken, manageCategories, controller.create);
categoryRouter.patch("/:id", authenticateAccessToken, manageCategories, controller.update);
categoryRouter.patch(
  "/:id/availability",
  authenticateAccessToken,
  manageCategories,
  controller.setAvailability,
);
categoryRouter.delete("/:id", authenticateAccessToken, manageCategories, controller.remove);

export default categoryRouter;
