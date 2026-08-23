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

## API documentation

Start the service with `pnpm run dev`, then open
`http://localhost:8001/api/v1/catalog/docs` for the interactive Swagger UI.
The raw OpenAPI document is available at
`http://localhost:8001/api/v1/catalog/openapi.yaml`. Use the **Authorize** button
to provide a JWT in the `Bearer` format.
