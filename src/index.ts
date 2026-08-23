import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { logger } from "./utils/logger.js";
import { Config } from "./config/index.js";
import categoryRouter from "./category/category.router.js";
import { openApiDocument, swaggerUi } from "./docs/swagger.js";
import productRouter from "./product/product.router.js";
import variantRouter from "./variant/variant.router.js";
import addOnRouter from "./add-on/add-on.router.js";
import menuRouter from "./menu/menu.router.js";

const app = new Hono({ strict: false }).basePath("/api/v1/catalog");

app.use("*", honoLogger());
app.use(
  "*",
  cors({
    origin: ["http://localhost:3000", Config.frontendURL],
    credentials: true,
  }),
);

app.get("/", (c) => {
  return c.text("Hello, everybody!");
});

app.get("/openapi.yaml", openApiDocument);
app.get("/docs", swaggerUi);
app.route("/categories", categoryRouter);
app.route("/products", productRouter);
app.route("/", variantRouter);
app.route("/", addOnRouter);
app.route("/", menuRouter);

// global error handler
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    logger.warn({ err, path: c.req.path }, err.message);
    return c.json(
      {
        success: false,
        message: err.message,
        status: err.status,
      },
      err.status,
    );
  }

  logger.error({ err, path: c.req.path }, "Unhandled error");
  return c.json(
    {
      success: false,
      message:
        process.env.NODE_ENV === "production"
          ? "Internal Server Error"
          : err.message || "Internal Server Error",
      status: 500,
    },
    500,
  );
});

export default app;

serve(
  {
    fetch: app.fetch,
    port: Config.port,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
