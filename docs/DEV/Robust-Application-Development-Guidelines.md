# Robust Application Development Guidelines
### For use as a system prompt / rulebook for a code generator

This guideline is organized by the architectural layers shown in your diagram: Frontend → API/Backend → Database → Auth → Hosting → Cloud/Compute → CI/CD → Security → Rate Limiting → Cache/CDN → Load Balancing/Scalability → Error Tracking/Logs → High Availability/Disaster Recovery.

Feed this to your code generator as a standing set of rules so every feature it produces is robust by default, not just "working."

---

## 1. Frontend

- Separate presentation, state, and data-fetching logic (components should not directly own business logic).
- Validate all user input on the client **and** re-validate on the server — never trust client-side validation alone.
- Handle three states for every async UI element: loading, error, and empty — never assume the "happy path" only.
- Use environment variables for all URLs/keys; never hardcode API endpoints or secrets in frontend code.
- Make components accessible (semantic HTML, ARIA labels, keyboard navigation) and responsive by default.
- Centralize API calls in a single service/client layer so retries, auth headers, and error handling are consistent.

## 2. APIs & Backend Logic

- Design APIs around clear resource/action contracts (REST/GraphQL/RPC) with versioning from day one (`/v1/...`).
- Enforce input validation and schema checks on every endpoint (e.g., with a schema library) before touching business logic.
- Keep business logic in service/domain layers, not in route handlers/controllers — controllers should only orchestrate.
- Every endpoint must return consistent, structured error responses (error code, message, correlation/request ID).
- Apply the principle of least surprise: idempotent operations for retries (especially POST/PUT actions tied to payments or state changes).
- Log every request with a unique request ID that propagates through downstream calls for traceability.

## 3. Database & Storage

- Use migrations for all schema changes — never edit production schema manually.
- Define proper constraints (foreign keys, unique constraints, not-null) at the DB level, not just in application code.
- Use transactions for any multi-step write to guarantee atomicity.
- Index fields used in frequent lookups/joins; review query plans for anything user-facing.
- Separate read and write concerns where scale demands it (read replicas), but design for a single source of truth.
- Automate backups and periodically test restoring from them — an untested backup is not a backup.
- Never store secrets or plaintext sensitive data (passwords, tokens, PII) unencrypted.

## 4. Authentication & Authorization

- Use industry-standard protocols (OAuth2/OIDC, JWT with short expiry + refresh tokens) instead of custom auth schemes.
- Enforce authorization checks server-side on every protected resource — never rely on hiding UI elements as a security measure.
- Apply the principle of least privilege: role-based or attribute-based access control, scoped tightly per resource.
- Hash passwords with a strong algorithm (bcrypt/argon2), never store or log raw passwords or tokens.
- Support token revocation/session invalidation (logout must actually invalidate, not just clear client storage).
- Rate-limit authentication endpoints specifically (login, password reset) to prevent brute force.

## 5. Hosting & Deployment

- Use infrastructure-as-code (Terraform, Pulumi, etc.) so environments are reproducible, not manually configured.
- Maintain separate environments: development, staging, production — with no shared credentials between them.
- Deploy via immutable artifacts (containers/images) rather than mutating servers in place.
- Support zero-downtime deployments (rolling or blue-green) as the default deployment strategy.
- Store all configuration (not secrets) in environment-specific config files or config services, never hardcoded.

## 6. Cloud & Compute Resources

- Right-size compute resources and set autoscaling policies based on real load metrics, not guesses.
- Design services to be stateless where possible so any instance can handle any request.
- Use managed services (managed DB, managed queues) over self-hosted equivalents unless there's a strong reason not to.
- Tag/label all resources by environment and project for cost tracking and cleanup.
- Set resource limits (CPU/memory) on every deployed service to prevent one component from starving others.

## 7. CI/CD & Version Control

- Every change goes through a pull/merge request with at least one review — no direct pushes to main/production branches.
- Run automated tests (unit, integration, and where applicable end-to-end) on every commit before merge.
- Enforce linting, type-checking, and static analysis as required CI steps, not optional ones.
- Automate the deployment pipeline: build → test → security scan → deploy, with manual approval gates only where necessary (e.g., production release).
- Tag releases semantically (semver) and maintain a changelog generated from commit history.
- Ensure rollbacks are a first-class, tested capability, not an afterthought.

## 8. Security & Access Control

- Apply the principle of least privilege everywhere: service accounts, database users, and API keys should have the minimum scope needed.
- Sanitize and parameterize all database queries to prevent injection attacks — never build SQL via string concatenation.
- Set secure HTTP headers by default (CSP, HSTS, X-Frame-Options, X-Content-Type-Options).
- Encrypt data in transit (TLS everywhere) and at rest (disk/DB encryption) as a non-negotiable default.
- Rotate secrets and API keys regularly; store them in a secrets manager, never in source control.
- Run dependency vulnerability scans as part of CI, and patch critical CVEs promptly.
- Conduct input validation and output encoding to prevent XSS/CSRF alongside injection defenses.

## 9. Rate Limiting

- Apply rate limits per user/IP/API key on all public-facing endpoints, with stricter limits on sensitive actions (auth, payments, search).
- Return clear, standard responses when limits are hit (HTTP 429 + `Retry-After` header).
- Use a distributed rate limiter (not in-memory per-instance) when running multiple service instances.
- Differentiate limits by tier/plan if the application has different user classes (free vs. paid).

## 10. Cache & CDN

- Cache aggressively for static/rarely-changing content via CDN; set explicit cache-control headers.
- Use application-level caching (Redis/Memcached) for expensive or frequently repeated queries, with a clear invalidation strategy.
- Never cache sensitive/user-specific data in shared/public caches.
- Define a cache invalidation plan up front (TTL-based, event-based, or both) — "cache it" without an invalidation strategy is a future bug.

## 11. Load Balancing & Scalability

- Design services to scale horizontally by default (stateless, no local session storage).
- Put a load balancer in front of any service with more than one instance; use health checks to route only to healthy instances.
- Plan for graceful degradation under load (e.g., feature flags to disable non-critical features when the system is stressed) rather than full outage.
- Load-test critical paths before launch to know real capacity limits, not assumed ones.

## 12. Error Tracking & Logs

- Centralize logs (structured JSON logs) into a single aggregation system — don't rely on scattered per-server log files.
- Capture and alert on unhandled exceptions automatically (e.g., via an error tracking service) rather than discovering them from user complaints.
- Log at appropriate levels (debug/info/warn/error) and avoid logging sensitive data (passwords, tokens, full PII).
- Include correlation/request IDs in every log line so a single request can be traced across services.
- Set up alerting thresholds (error rate spikes, latency spikes) tied to on-call notification, not just dashboards nobody watches.

## 13. High Availability & Disaster Recovery

- Define and document RTO (Recovery Time Objective) and RPO (Recovery Point Objective) for the application.
- Avoid single points of failure: replicate critical services and data across at least two availability zones/regions where feasible.
- Automate failover for the database and critical services; test failover periodically, not just in theory.
- Maintain a documented, tested disaster recovery runbook (what to do when X fails), and rehearse it (game days/chaos testing) periodically.
- Back up data on a schedule matching your RPO, with backups stored in a separate location/region from primary data.

---

## Cross-Cutting Principles (apply at every layer)

1. **Fail loudly in dev, gracefully in prod** — surface errors clearly during development; degrade gracefully and log thoroughly in production.
2. **Idempotency by default** for any operation that might be retried (network retries, queue redelivery, user double-clicks).
3. **Config over hardcoding** — anything that differs between environments (URLs, limits, feature flags) belongs in config, not code.
4. **Security is not a layer, it's a cross-cutting concern** — validate input, enforce authz, and encrypt data at every layer, not just at the "Security" step.
5. **Everything observable** — every service should expose health checks, metrics, and structured logs from day one.
6. **Test the failure paths, not just the success paths** — write tests for timeouts, invalid input, partial failures, and race conditions.
7. **Document as you build** — API contracts, architecture decisions, and runbooks should be generated/updated alongside the code, not after.

---

### How to use this with a code generator

Feed this document (or a condensed version) as a system/context prompt so the generator defaults to these practices without being asked each time. You can also split it into per-layer checklists and require the generator to self-check its output against the relevant checklist before finalizing any feature (e.g., "Before returning this API endpoint, confirm: input validation ✅, auth check ✅, structured error handling ✅, logging with request ID ✅").