import { Hono } from "hono";
import { CategoryController } from "./category.controller.js";
import { authenticateAccessToken } from "../middleware/authenticate.js";
import { requireRoles } from "../middleware/require-roles.js";

export const categoryRouter = new Hono();
const controller = new CategoryController();

categoryRouter.use("*", authenticateAccessToken);
categoryRouter.use("*", requireRoles("admin", "manager"));

categoryRouter.get("/", controller.list);
categoryRouter.get("/:id", controller.getById);
categoryRouter.post("/", controller.create);
categoryRouter.patch("/:id", controller.update);
categoryRouter.patch("/:id/availability", controller.setAvailability);
categoryRouter.delete("/:id", controller.remove);

export default categoryRouter;
