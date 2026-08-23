import { Hono } from "hono";
import { MenuController } from "./menu.controller.js";

export const menuRouter = new Hono();
const controller = new MenuController();

menuRouter.get("/:tenantId/menu", controller.getMenu);
menuRouter.get("/:tenantId/products/:productId", controller.getProduct);

export default menuRouter;
