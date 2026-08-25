```
npm install
npm run dev
```

```
open http://localhost:3000
```

## Category API

The category management endpoints are available under `/api/v1/catalog/categories`.
The category router authenticates access tokens locally, then reads the verified
`user.role` and `user.tenantId` values from the Hono context; there are no
client-controlled role or tenant headers. Configure `JWT_SECRET` with the
auth-service HS256 signing secret.

- `GET /` and `GET /:id` list or retrieve tenant categories.
- `POST /` creates a category with `name`, optional `parentId`, `displayOrder`, and `icon`.
- `PATCH /:id` updates those fields; `PATCH /:id/availability` cascades activation to descendants and their products.
- `DELETE /:id` deletes only categories with no child categories or products.

Product management is available under `/api/v1/catalog/products`. Product creation
requires at least one variant and can include `addOnIds`; product details return
the product, its variants, and attached add-ons. Product deletion is a soft delete.
Admins and managers can manage products, while staff can also use only the
availability endpoint.

Product create and update support `multipart/form-data` with an `image` file.
Images must be image files smaller than 5 MB. Configure
`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in
the environment; JSON requests with an existing `imageUrl` are also supported.

Variant management endpoints are available under `/api/v1/catalog/products/:productId/variants`
and `/api/v1/catalog/variants/:id`. Admins and managers can create or edit variants,
staff can change availability, and only admins can delete variants. A product must
always retain at least one variant.

Add-on endpoints are available under `/api/v1/catalog/add-ons` and
`/api/v1/catalog/products/:productId/add-ons/:addOnId`. Admins and managers can
create, edit, attach, and detach add-ons; only admins can delete an add-on.
Deleting an add-on also removes its product attachments.

Public menu endpoints:

- `GET /api/v1/catalog/:tenantId/menu` returns the nested active menu and is cacheable.
- `GET /api/v1/catalog/:tenantId/products/:productId` returns active product details,
  including variants and add-ons.

These endpoints do not require authentication.

Health endpoints are available under `/api/v1/catalog/health`:

- `/live` checks that the application process is running.
- `/ready` checks application and database readiness.
- `/` returns the overall application and database health.
- `/database` checks only the database connection.

## API documentation

Start the service with `pnpm run dev`, then open
`http://localhost:8001/api/v1/catalog/docs` for the interactive Swagger UI.
The raw OpenAPI document is available at
`http://localhost:8001/api/v1/catalog/openapi.yaml`. Use the **Authorize** button
to provide a JWT in the `Bearer` format.
