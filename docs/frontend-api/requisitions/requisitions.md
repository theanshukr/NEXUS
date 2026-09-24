# Frontend API: Requisitions (`endpoints.md`)

## Get Requisitions
- **HTTP Method & URL**: `GET /api/v1/requisitions`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response (`200 OK`)**: Returns requisitions list.

## Get Requisition By Id
- **HTTP Method & URL**: `GET /api/v1/requisitions/:id`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response (`200 OK`)**: Returns requisition details.

## Create Requisition
- **HTTP Method & URL**: `POST /api/v1/requisitions`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response (`201 OK`)**: Returns created requisition.

## Update Requisition
- **HTTP Method & URL**: `PUT /api/v1/requisitions/:id`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response (`200 OK`)**: Returns updated requisition.

## Submit For Approval
- **HTTP Method & URL**: `PATCH /api/v1/requisitions/:id/submit-approval`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response (`200 OK`)**: Submits requisition for approval.

## Approve Requisition
- **HTTP Method & URL**: `PATCH /api/v1/requisitions/:id/approve`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response (`200 OK`)**: Approves requisition.

## Reject Requisition
- **HTTP Method & URL**: `PATCH /api/v1/requisitions/:id/reject`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response (`200 OK`)**: Rejects requisition.

## Publish Requisition
- **HTTP Method & URL**: `PATCH /api/v1/requisitions/:id/publish`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response (`200 OK`)**: Publishes requisition.

## Close Requisition
- **HTTP Method & URL**: `PATCH /api/v1/requisitions/:id/close`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response (`200 OK`)**: Closes requisition.

## Delete Requisition
- **HTTP Method & URL**: `DELETE /api/v1/requisitions/:id`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response (`200 OK`)**: Deletes requisition.
