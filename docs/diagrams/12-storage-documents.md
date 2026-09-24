# Storage & Document Management

## Purpose

This document describes how file uploads are handled, how the storage provider abstraction works, and how the Document module enforces fine-grained access control via its ACL system.

## Architectural Overview

NexusOps uses a two-layer architecture for file handling:

1. **`StorageService` (Platform layer)** — A provider-agnostic file I/O abstraction. Uploads, downloads, deletions, and signed URL generation are handled through a common interface regardless of the underlying provider (Supabase in production, local filesystem in development).

2. **Document Module (Application layer)** — A domain layer built on top of `StorageService` that adds ownership, metadata, and fine-grained ACL-based access control to every uploaded file.

## Storage Provider Architecture

```mermaid
graph TB
    subgraph "Application Code"
        DS["DocumentService"]
        TR["Storage Test Routes\n(dev only)"]
    end

    subgraph "StorageService (Platform)"
        API["upload() / download()\ndelete() / createSignedUrl()"]
        CFG["STORAGE_CONFIG\nPROVIDER = supabase | local"]
        PROV{{"Provider selection\nat startup"}}
        SUP["SupabaseStorageProvider\n(production)"]
        LOC["LocalStorageProvider\n(development)"]
    end

    DS & TR --> API
    API --> CFG --> PROV
    PROV -->|"supabase"| SUP
    PROV -->|"local"| LOC
```

## File Upload Flow

```mermaid
sequenceDiagram
    actor Client
    participant DC as DocumentController
    participant MULTER as Multer Middleware
    participant DS as DocumentService
    participant SS as StorageService
    participant SUP as Supabase Storage
    participant DB as MongoDB

    Client->>MULTER: POST /documents (multipart/form-data)
    MULTER-->>DC: req.file = { buffer, mimetype, size }
    DC->>DS: createDocument(file, metadata, userId, orgId)
    DS->>SS: upload(file, { category: 'documents' })
    SS->>SS: Generate path: documents/{UUID}
    SS->>SUP: PUT file to Supabase bucket
    SUP-->>SS: { path, size, mimeType }
    SS-->>DS: { provider, bucket, path, mimeType, size }
    DS->>DB: Create Document record { storagePath, ownerId, ... }
    DS->>DB: Create DocumentAccess record { OWNER grant }
    DS-->>Client: 201 { documentId, path }
```

## Document ACL Model

The Document module implements a **deny-by-default, multi-principal ACL** system. Access to a document is controlled by `DocumentAccess` grants that can be attached to users, roles, departments, teams, or the entire organization.

```mermaid
erDiagram
    Document ||--o{ DocumentAccess : "controlled by"
    DocumentAccess {
        ObjectId documentId
        string principalType
        ObjectId principalId
        string accessLevel
        date expiresAt
    }
```

Access levels form a hierarchy:

| Level | Score | Can Do |
|---|---|---|
| `OWNER` | 50 | Everything, including revoking grants |
| `SHARE` | 40 | Share the document with others |
| `DELETE` | 30 | Delete the document |
| `WRITE` | 20 | Edit metadata, upload new version |
| `READ` | 10 | View and download |

## ACL Resolution

```mermaid
flowchart TD
    REQ["Document access request\n{ document, principal, requiredLevel }"]

    OWNER_CHECK{{"document.ownerId\n== principal.userId?"}}
    OWNER_PASS["Grant OWNER-level access\n(skip grant lookup)"]

    FETCH["DocumentAccessRepository\n.findActiveGrants(documentId, orgId)\n(expired grants filtered by DB query)"]

    MATCH["Evaluate each grant:\n- principalType: USER → match userId\n- principalType: ROLE → match any roleId\n- principalType: DEPARTMENT → match any deptId\n- principalType: ORGANIZATION → always match"]

    HIGHEST["Track highest matching\naccessLevel score"]

    DENY{{"No grants matched?"}}
    COMPARE{{"grantedScore\n>= requiredScore?"}}

    ALLOW["return true"]
    FORBIDDEN["throw ForbiddenError\n403"]

    REQ --> OWNER_CHECK
    OWNER_CHECK -->|"yes"| OWNER_PASS --> ALLOW
    OWNER_CHECK -->|"no"| FETCH --> MATCH --> HIGHEST --> DENY
    DENY -->|"yes"| FORBIDDEN
    DENY -->|"no"| COMPARE
    COMPARE -->|"yes"| ALLOW
    COMPARE -->|"no"| FORBIDDEN
```

*When multiple grants match (e.g., a user has both a USER grant at `READ` and a ROLE grant at `WRITE`), the highest-scoring grant wins. This implements a "most-permissive matching grant" conflict resolution policy.*

## Signed URL Generation

Documents are stored privately. Access is provided via **time-limited signed URLs** — direct public URLs to storage are never exposed.

```mermaid
sequenceDiagram
    actor Client
    participant DS as DocumentService
    participant ACL as ACLResolver
    participant SS as StorageService

    Client->>DS: GET /documents/:id/download
    DS->>ACL: canAccess({ document, principal, requiredLevel: 'READ' })
    ACL-->>DS: true (or 403)
    DS->>SS: createSignedUrl(document.storagePath, 60)
    SS-->>DS: https://storage.example.com/...?token=...&expires=...
    DS-->>Client: 200 { signedUrl, expiresAt }
```

Default URL expiry: 60 seconds. The client must use the signed URL immediately; it cannot be shared or bookmarked.

## Key Takeaways

- **`StorageService` is provider-agnostic.** Switching from Supabase to AWS S3 requires only a new `S3StorageProvider` class that implements the `StorageProvider` interface — no application code changes.
- **File paths are UUID-based and unpredictable.** A file stored at `documents/{UUID}` cannot be guessed or enumerated.
- **Document ownership is implicit.** The user who uploads a document is automatically granted `OWNER` access via a `DocumentAccess` record created at upload time.
- **ACL resolution is deny-by-default.** A document with no grants is inaccessible to everyone except the owner. There is no "public by default" state.
- **Time-limited signed URLs prevent hotlinking.** Files are never directly accessible by URL; access always requires a fresh signed URL issued by the API after ACL verification.
