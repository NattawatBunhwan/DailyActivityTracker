# DailyActivityTracker

## Project overview

DailyActivityTracker is a React and TypeScript web app backed by an ASP.NET Core API. The frontend uses React 19, TypeScript 6, Vite 8, ESLint 10, and npm. The backend targets .NET 8 and uses EF Core 8 with PostgreSQL through Npgsql.

## Repository structure and boundaries

- `frontend/src/api`: frontend HTTP/API calls and response handling.
- `frontend/src/components`, `context`, `hooks`, `types`, and `utils`: UI, shared state, hooks, data types, and helpers.
- `backend/src/DailyActivityTracker.Api`: HTTP controllers, middleware, and application startup/configuration.
- `backend/src/DailyActivityTracker.Application`: feature services, DTOs, validation, exceptions, and interfaces.
- `backend/src/DailyActivityTracker.Domain`: domain entities and shared domain concepts.
- `backend/src/DailyActivityTracker.Infrastructure`: EF Core persistence, repositories, migrations, and security implementations.
- `backend/tests/DailyActivityTracker.Tests`: backend unit tests using xUnit and Moq.

Keep responsibilities in their existing layers. Inspect nearby code and follow established patterns before adding new ones. Keep controllers focused on HTTP concerns; put business behavior in Application services, domain concepts in Domain, and database access in Infrastructure.

## Frontend commands

Run these from `frontend/`:

- Development server: `npm run dev`
- Production build and TypeScript check: `npm run build`
- Lint: `npm run lint`
- Preview production build: `npm run preview`

There is no configured frontend test script or test runner. Do not claim frontend tests were run unless test infrastructure is added and actually used.

## Backend commands

Run these from the repository root:

- Build: `dotnet build backend/DailyActivityTracker.sln`
- Tests: `dotnet test backend/DailyActivityTracker.sln`
- Run API with the HTTPS launch profile: `dotnet run --project backend/src/DailyActivityTracker.Api/DailyActivityTracker.Api.csproj --launch-profile https`
- Start the local PostgreSQL service: `docker compose up -d postgres`

Do not invent project scripts or test capabilities. Run the relevant backend tests for behavior changes when practical.

## Testing and verification

- For backend behavior changes, add or update relevant tests when practical.
- For frontend changes, run relevant lint and build commands when the environment permits.
- Do not run builds or tests if they could interfere with a running application or shared outputs.
- Report which checks ran, their results, and any checks not run with the reason. Never imply an unrun check passed.

## Security and data ownership

- Preserve authentication, authorization, JWT issuer/audience/lifetime/signing-key validation, password hashing, and request validation. Do not weaken them without explicit justification and review.
- Scope all user-owned Activity reads and writes to the authenticated user. Derive identity through the existing current-user service; never trust a client-supplied user ID for ownership. Never expose one user's Activity data to another.
- Do not commit real credentials, tokens, or production secrets. Use the repository's supported configuration and secret mechanisms.
- The PostgreSQL password in `docker-compose.yml` is development-only. Never reuse it in production.
- Review authorization and ownership checks when changing controllers, services, repositories, or queries.

## Coding and change management

- Preserve existing behavior outside the requested change. Avoid unrelated refactoring and unnecessary dependencies.
- Keep API contracts stable unless the task requires a contract change; update consumers and relevant tests together when a change is required.
- Follow existing naming, formatting, validation, accessibility, and error-handling conventions in nearby code.
- Do not modify database schemas or migrations unless required by the task; review migration impact before changing them.
- Do not commit, push, merge, or create a pull request unless explicitly asked.

## Git and final verification

- Before finishing, inspect the diff and run `git diff --check` when applicable.
- Summarize changed files, verification results, and unresolved issues. Mention commands that were not run and why.
