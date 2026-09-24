# Authentication & Session Management

## Purpose

This document covers the complete authentication lifecycle: how users register via invitation, how they log in and receive tokens, how sessions are maintained across requests, how tokens are refreshed, and how logout works. It also covers brute-force protection and account lockout.

## Architectural Overview

Authentication is handled by `AuthService` and `TokenService` inside the `auth` module. The system uses short-lived **JWT access tokens** (stateless, verified on every request) paired with long-lived **refresh tokens** (stateful, stored in MongoDB and cached in Redis). Session state is maintained in Redis under a compound key. This allows instant session revocation without waiting for the JWT to expire.

## Registration via Invitation

Users are never self-registered. The only entry point into the platform is a cryptographic invitation link.

```mermaid
sequenceDiagram
    actor Admin
    participant IS as InviteService
    participant DB as MongoDB
    participant Email as Email Service
    actor Invitee

    Admin->>IS: POST /invites { email, roleIds }
    IS->>IS: Check invite.create permission (RBAC)
    IS->>IS: Check RoleDelegationPolicy
    Note over IS: Verify admin can grant all requested roles
    IS->>IS: Generate SHA-256 hex token
    IS->>DB: Store hashed token + TTL (7 days)
    IS->>Email: Send invitation link with raw token
    Email-->>Invitee: Invitation email

    Invitee->>IS: GET /invites/validate/:token
    IS->>DB: Hash token → lookup → check expiry
    IS-->>Invitee: { organizationId, email, roles }

    Invitee->>Auth: POST /auth/register { token, password, ... }
    Auth->>DB: ACID Transaction:
    Note over DB: Create User record\nCreate UserRole bindings\nMark invitation ACCEPTED
    DB-->>Auth: User created
    Auth-->>Invitee: 201 Created
```

## Login Flow

```mermaid
sequenceDiagram
    actor User
    participant AC as AuthController
    participant AS as AuthService
    participant UR as UserRepository
    participant TS as TokenService
    participant CS as CacheService
    participant TR as TokenRepository

    User->>AC: POST /auth/login { email, password, [orgCode] }
    AC->>AS: login(email, password, orgCode)
    AS->>UR: findByEmailAndTenant()
    UR-->>AS: User document

    alt Account is SUSPENDED
        AS-->>User: 403 ERR_FORBIDDEN
    else Account is LOCKED and within cooldown
        AS-->>User: 423 ERR_ACCOUNT_LOCKED
    end

    AS->>AS: comparePassword(bcrypt)

    alt Wrong password
        AS->>UR: incrementFailedLogins()
        alt failedAttempts >= 5
            AS->>UR: lockAccount(lockoutUntil = now + 15min)
            AS-->>User: 423 ERR_ACCOUNT_LOCKED
        else
            AS-->>User: 401 Invalid credentials
        end
    end

    AS->>UR: resetFailedLogins()
    AS->>TS: generateAccessToken(user, sessionId)
    Note over TS: JWT signed with JWT_ACCESS_SECRET\nExpiry: 15 minutes\nPayload: userId, organizationId, email, sessionId
    AS->>TS: generateRefreshToken(user, req)
    Note over TS: Store hash in MongoDB\nCache raw token in Redis (7 days)
    AS->>CS: set(tenant:orgId:session:userId:sessionId, 1, 7d)
    AS-->>User: 200 { accessToken, refreshToken, user }
```

## Token Architecture

```mermaid
graph LR
    subgraph "Access Token (JWT)"
        AT["Short-lived: 15 minutes\nSelf-contained: userId, orgId, sessionId\nVerified via jwt.verify() on every request\nSession liveness checked in Redis"]
    end

    subgraph "Refresh Token"
        RT["Long-lived: 7 days\nOpaque random string\nHashed copy stored in MongoDB\nRaw copy cached in Redis for fast lookup"]
    end

    subgraph "Session Record (Redis)"
        SR["Key: tenant:orgId:session:userId:sessionId\nValue: 1\nTTL: 7 days\nDeletion = instant revocation"]
    end

    AT -.->|"sessionId links"| SR
    RT -.->|"token rotation links"| SR
```

## Token Refresh

```mermaid
sequenceDiagram
    actor Client
    participant AC as AuthController
    participant TS as TokenService
    participant TR as TokenRepository
    participant CS as CacheService

    Client->>AC: POST /auth/refresh { refreshToken }
    AC->>TS: refreshAccessToken(refreshToken)
    TS->>TS: Hash the provided refresh token (SHA-256)
    TS->>TR: findByTokenHash(hash)
    TR-->>TS: StoredToken { userId, organizationId, isRevoked, expiresAt }

    alt Token revoked or expired
        TS-->>Client: 401 ERR_UNAUTHORIZED
    end

    TS->>TR: revokeToken(oldToken._id)
    TS->>TS: generateNewRefreshToken(user)
    TS->>TS: generateNewAccessToken(user, newSessionId)
    TS->>CS: Update session key in Redis
    TS-->>Client: 200 { accessToken, newRefreshToken }
```

*Refresh token rotation: each refresh issues a new token and revokes the old one. A stolen refresh token can only be used once.*

## Logout & Session Revocation

```mermaid
flowchart LR
    LOGOUT["POST /auth/logout"]
    DEL_SESSION["CacheService.delete()\ntenant:orgId:session:userId:sessionId"]
    REVOKE_RT["TokenRepository.revokeToken()\nSet isRevoked=true in MongoDB"]
    DONE["All subsequent\nrequests blocked"]

    LOGOUT --> DEL_SESSION
    LOGOUT --> REVOKE_RT
    DEL_SESSION --> DONE
    REVOKE_RT --> DONE
```

## Account Security States

```mermaid
stateDiagram-v2
    [*] --> ACTIVE: Registration complete
    ACTIVE --> LOCKED: 5 consecutive failed logins
    LOCKED --> ACTIVE: Cooldown expired OR admin reset
    ACTIVE --> SUSPENDED: Admin suspension action
    SUSPENDED --> ACTIVE: Admin reactivation
    ACTIVE --> TERMINATED: Employee offboarding
```

## Key Takeaways

- **Invitations are the only user creation path.** No public self-registration endpoint exists.
- **Session liveness is checked on every request in Redis.** A 15-minute JWT is not enough to maintain access if the Redis session key has been deleted.
- **Brute-force protection is automatic.** Five consecutive wrong passwords trigger a 15-minute account lockout stored in MongoDB.
- **Token rotation prevents refresh token replay attacks.** Each use of a refresh token invalidates the previous one.
- **`revokeAllSessions(userId)` exists for bulk revocation.** Called during employee suspension or termination workflows.
