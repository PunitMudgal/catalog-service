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

Variant management endpoints are available under `/api/v1/catalog/products/:productId/variants`
and `/api/v1/catalog/variants/:id`. Admins and managers can create or edit variants,
staff can change availability, and only admins can delete variants. A product must
always retain at least one variant.

## API documentation

Start the service with `pnpm run dev`, then open
`http://localhost:8001/api/v1/catalog/docs` for the interactive Swagger UI.
The raw OpenAPI document is available at
`http://localhost:8001/api/v1/catalog/openapi.yaml`. Use the **Authorize** button
to provide a JWT in the `Bearer` format.
