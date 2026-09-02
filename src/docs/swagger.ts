import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Context } from "hono";

const openApiPath = resolve(process.cwd(), "docs/openapi.yaml");

export async function openApiDocument(c: Context) {
  try {
    const document = await readFile(openApiPath, "utf8");
    c.header("Content-Type", "text/yaml; charset=UTF-8");
    return c.body(document);
  } catch {
    return c.json(
      {
        success: false,
        message: "OpenAPI document is unavailable",
        status: 500,
      },
      500,
    );
  }
}

export function swaggerUi(c: Context) {
  return c.html(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Catalog Service API</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => SwaggerUIBundle({
        url: "/api/v1/openapi.yaml",
        dom_id: "#swagger-ui"
      });
    </script>
  </body>
</html>`);
}
