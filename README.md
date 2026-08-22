# Secure Login System - Authentication & File Access
A secure authentication and file-access backend built with Express, TypeScript, Bun, Appwrite, Zod, and Argon2. The project implements user registration, login, session-based authentication, logout, protected user details, user-specific file access, file ownership checks, and separation between file metadata and actual file storage.
Another is the Appwrite Bakcned implementation of all the operations.
The project was developed as part of the Secure Login System with User Details & File Access assignment. The supplied `index.html` is used as the testing client; no separate frontend GUI is required.
## Features
- User registration with email and password
- Input validation using Zod
- Secure password hashing using Argon2
- Session-based authentication
- HTTP-only cookie-based session handling
- Authentication middleware for protected routes
- Authenticated user attached to `req.user`
- Protected `/me` endpoint
- Server-side session invalidation on logout
- Generic authentication failure responses
- Basic brute-force/rate-limit protection
- User-specific file listing
- Individual file lookup
- File ownership authorization
- Protected file downloads
- Separation of file metadata and actual file contents
- Appwrite Database for file metadata
- Appwrite Storage for actual files
- Appwrite authentication/session infrastructure
- Application-level authorization through an Appwrite adapter
- Multiple-user isolation testing
- Custom application-level `fileID`
## Tech Stack
| Technology | Purpose |
| --- | --- |
| Bun | Runtime and package manager |
| TypeScript | Application language |
| Express | HTTP server and API routing |
| Appwrite | Authentication, database, and file storage infrastructure |
| Zod | Request validation |
| Argon2 | Password hashing |
| Prisma | Database/data-access layer used by the application |
## Architecture
The application uses the supplied HTML testing client to communicate with the backend. The express backend handles authentication, authorization, validation, metadata resolution, etc, whole the Appwrite adapter file talks to the appwrite adapter which handles all appwrite operations, thus, 2 seperate implementations.
~~~text

                              ┌──────────────────────┐
                              │      index.html      │
                              │     Test Client      │
                              └──────────┬───────────┘
                                         │
                       ┌─────────────────┴─────────────────┐
                       │                                   │
                    HTTP Request                    Direct function call
                       │                                   │
                       ▼                                   ▼
              ┌──────────────────┐             ┌─────────────────────────┐
              │   Express API    │             │ appwrite-adapter.js     │
              │    TypeScript    │             │    Appwrite Adapter     │
              └────────┬─────────┘             └────────────┬────────────┘
                       │                                    │
              ┌────────┼────────┐                           │
              │        │        │                           │
              ▼        ▼        ▼                           ▼
          ┌───────┐ ┌──────┐ ┌────────────┐        ┌─────────────────┐
          │ Auth  │ │Zod   │ │  Prisma    │        │    Appwrite     │
          │Routes │ │Valid.│ │ PostgreSQL │        └────────┬────────┘
          └───────┘ └──────┘ └────────────┘                 │
                                                            │
                                                     ┌──────┴───────┐
                                                     │              │
                                                     ▼              ▼
                                              ┌────────────┐ ┌─────────────┐
                                              │  Database  │ │   Storage   │
                                              │  Metadata  │ │ Actual Files│
                                              └────────────┘ └─────────────┘
~~~

## Project Structure
The project is organized so that routes, middleware, validation, types, and Appwrite-specific functionality are separated rather than putting the entire backend into one file.
~~~text
.
├── client/
│   ├── index.html
│   └── mock-api.js
├── src/
│   ├── lib/
│   ├── middleware/
│   ├── routes/
│   ├── schemas/
│   └── types/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── storage/
├── appwrite/appwrite-adapter.js
├── lib/
│   └── prisma.ts
├── .gitignore
├── index.ts
├── package.json
├── prisma.config.ts
├── tsconfig.json
└── README.md
~~~

## Authentication Flow
The authentication flow begins when the browser sends credentials to the backend.
~~~text
Client
  │
  │ email + password
  ▼
POST /login
  │
  ▼
Validate request with Zod
  │
  ▼
Find/authenticate user
  │
  ▼
Verify password
  │
  ▼
Create session
  │
  ▼
Session cookie
  │
  ▼
Future protected requests
~~~
For protected requests:
~~~text
Protected Request
      │
      ▼
Authentication Middleware
      │
      ▼
Validate session
      │
      ├── Invalid/missing ──> 401 Unauthorized
      │
      └── Valid
           │
           ▼
      Identify user
           │
           ▼
      req.user
           │
           ▼
      Protected route
~~~
The middleware establishes the authenticated identity once so individual protected routes do not need to repeat the same session lookup.
## Registration
Registration accepts an email and password and validates the request before creating the user.
~~~text
POST /register
      │
      ▼
Validate input
      │
      ▼
Create user
      │
      ▼
Hash/store password securely
      │
      ▼
User created
~~~
Passwords are never intended to be stored as plaintext.
## Password Security
Passwords are stored using a password-hashing algorithm rather than plaintext or reversible encryption.
The basic model is:
~~~text
Plain password
      │
      ▼
    Argon2
      │
      ▼
Password hash
      │
      ▼
Database
~~~
During authentication, the submitted password is verified against the stored hash.
The application does not decrypt passwords because password hashing is not encryption.
### Why Argon2 instead of bcrypt?
Argon2 is a modern password-hashing algorithm designed specifically for password storage. One of its important properties is that it is memory-hard, meaning password verification deliberately requires memory as well as computational work.
This makes large-scale password cracking more expensive, particularly when attackers use specialized hardware.
bcrypt is also a strong and widely used password-hashing algorithm, but Argon2 provides a more modern memory-hard design and I learned about it in my Intro to Cyber Security subject, so used it over bcrypt.
~~~text
Encryption:
Plaintext → Encryption → Ciphertext
Ciphertext → Decryption → Plaintext
Password hashing:
Password → Argon2 → Hash
Password + Hash → Verification
~~~
## Login
The login endpoint validates the request and authenticates the supplied credentials.
~~~text
POST /login
      │
      ▼
Zod validation
      │
      ▼
Find user
      │
      ▼
Verify password against stored hash
      │
      ├── Invalid ──> Generic authentication error
      │
      └── Valid
           │
           ▼
       Create session
           │
           ▼
       Authenticated
~~~
### Generic Login Errors
The login process does not intentionally reveal whether the email or password was the incorrect part of the credentials.
Returning different errors such as:
~~~text
"Email does not exist"
~~~
and:
~~~text
"Incorrect password"
~~~
would allow an attacker to enumerate registered accounts.
Instead, failed authentication uses a generic error so the response does not disclose whether a particular email address is registered.
## Sessions
The application uses session-based authentication.
The session represents the authenticated state and is associated with the user on the server/authentication provider.
A protected request therefore relies on the session rather than trusting a user ID supplied by the client.
The basic model is:
~~~text
Login
  │
  ▼
Session created
  │
  ▼
Session identifier stored in cookie
  │
  ▼
Browser automatically sends cookie
  │
  ▼
Server validates session
  │
  ▼
Authenticated request
~~~
### Why sessions instead of a stateless JWT?
The assignment requires server-side logout/invalidation.
With a purely stateless JWT, an already-issued token normally remains valid until it expires unless an additional revocation mechanism is implemented.
A server-side session makes immediate invalidation much more straightforward:
~~~text
Before logout:
Client ── session ──> Server
                       │
                       └── Valid
                            │
                            ▼
                       Access granted
After logout:
Client ── old session ──> Server
                          │
                          └── Invalid
                               │
                               ▼
                          Access denied
~~~
## Cookies
The browser automatically attaches cookies to matching HTTP requests. This means the client does not have to manually retrieve a session value from `localStorage` and attach it to every request.
The supplied test client supports both cookie-based authentication and bearer-token authentication, but the session-based flow uses cookies.
### HttpOnly
`HttpOnly` prevents client-side JavaScript from reading the cookie through APIs such as:
~~~javascript
document.cookie
~~~
The browser can still send the cookie with HTTP requests, but JavaScript cannot directly access the cookie value.
This reduces the ability of injected client-side JavaScript to steal the session identifier.
### SameSite
`SameSite` controls whether a cookie is sent in cross-site request contexts.
For example, `SameSite=Lax` allows certain top-level cross-site navigations while restricting many other cross-site requests.
This helps reduce the risk of cross-site request forgery.
### Secure
`Secure` instructs the browser to send the cookie only over HTTPS.
In production, authentication cookies should be configured appropriately for HTTPS.
## Logout
Logout invalidates the authenticated session on the server/authentication provider rather than relying only on deleting something in the browser.
~~~text
POST /logout
      │
      ▼
Invalidate/delete server-side session
      │
      ▼
Clear client-side authentication state
      │
      ▼
Old session can no longer authenticate
~~~
This is important because deleting a cookie locally without invalidating the corresponding server-side session would not necessarily invalidate the session itself.
### Why delete multiple sessions?
The implementation can delete all sessions belonging to the authenticated user during logout.
This makes sense when logout means "log this account out everywhere".
If the requirement were specifically "log out only this device", then only the current session should be deleted.
For this assignment, invalidating the user's sessions provides a stronger server-side logout behaviour.
## Authentication Middleware
Protected endpoints use authentication middleware.
The middleware is responsible for:
1. Reading the authentication/session information.
2. Validating the session.
3. Determining the authenticated user.
4. Attaching that user to the request.
5. Rejecting unauthenticated requests before they reach protected route handlers.
~~~text
Request
  │
  ▼
Authentication Middleware
  │
  ├── No valid session ──> 401
  │
  └── Valid session
          │
          ▼
      Identify user
          │
          ▼
       req.user
          │
          ▼
    Protected route
~~~
This prevents every protected route from having to independently repeat authentication logic.
## Why `req.user` Exists
Once authentication middleware has successfully validated the session, the middleware already knows which user is making the request.
The middleware therefore attaches the authenticated user to the request:
~~~typescript
req.user = user;
~~~
The protected route can then use:
~~~typescript
req.user
~~~
instead of performing another session lookup.
The purpose is both structural and practical:
- Authentication is performed in one place.
- Protected routes receive the authenticated identity.
- The same session does not need to be verified repeatedly.
- Routes do not need to trust a client-provided user ID.
The server derives the identity from the authenticated session.
## `req.user!` and the Non-Null Assertion
In a protected route, code may use:
~~~typescript
req.user!.id
~~~
The `!` is a TypeScript non-null assertion.
It tells TypeScript that the developer knows the value is not `null` or `undefined` at that point.
It does not perform a runtime check and it does not create the user object.
The actual runtime guarantee comes from the authentication middleware.
The intended control flow is:
~~~text
Request
  │
  ▼
Authentication middleware
  │
  ├── Invalid ──> request rejected
  │
  └── Valid
       │
       ▼
   req.user assigned
       │
       ▼
Protected route
~~~
## Express Request Type Extension
Express's default `Request` type does not know about application-specific properties such as `req.user`.
The project extends Express's request type through TypeScript declaration merging.
Conceptually:
~~~typescript
declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}
~~~
`SessionUser` is a TypeScript type defined elsewhere in the project and imported into the declaration file.
It does not need to be physically declared inside `express.d.ts`.
This is a compile-time feature:
~~~text
TypeScript declaration
        │
        ▼
Compile-time type information
~~~
It does not create `req.user` at runtime.
At runtime, the middleware is what actually assigns the property.
## `select` When Returning Users
When retrieving a user from the database, returning the entire database record can expose fields that should remain internal.
For example:
~~~text
User
├── id
├── email
├── passwordHash
└── internal fields
~~~
The password hash should not be returned to the client.
A selective query allows the application to explicitly request only the fields required by the response.
~~~text
User
├── id              ✓
├── email           ✓
└── passwordHash    ✗
~~~
This follows the principle of least exposure and prevents sensitive fields from accidentally leaking through API responses.
## Protected User Details
The project provides a protected endpoint for the authenticated user's information, such as:
~~~http
GET /me
~~~
The server determines the user from the authenticated session.
It does not trust a user-supplied user ID to decide whose information should be returned.
~~~text
Authenticated Session
        │
        ▼
Current User ID
        │
        ▼
Query data belonging to current user
        │
        ▼
Return current user's data
~~~
This prevents a client from attempting to substitute another user's identifier and retrieve that user's information.
## File Storage Architecture
The project separates file metadata from actual file contents.
~~~text
                    File
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
     Database              Appwrite Storage
      metadata              actual file
          │                     │
          ▼                     ▼
      fileID                 binary data
      ownerID
      fileName
      storage ID
      other metadata
~~~
The database stores information required to identify and authorize a file.
The actual binary content is stored in Appwrite Storage.
This separation allows the application to perform ownership checks using metadata before resolving the actual stored file.
## File Metadata
File metadata describes the file rather than containing the file's binary content.
Depending on the current schema, metadata includes information such as:
- Custom `fileID`
- Owner/user ID
- Filename
- Storage file ID
- File information required by the application
The actual file content is stored separately in the Appwrite Storage bucket.
## File IDs
The project uses multiple identifiers because the application and Appwrite have different responsibilities.
~~~text
Custom fileID
    │
    └── Application-level file identifier
Database document ID
    │
    └── Appwrite-generated database document identifier
Storage file ID
    │
    └── Appwrite-generated storage object identifier
~~~
The custom `fileID` gives the application its own stable identifier for resolving a file.
For example:
~~~text
GET /files/003
      │
      ▼
Find metadata where fileID = 003
      │
      ├── ownerID
      ├── fileName
      └── storage identifier
      │
      ▼
Resolve actual file in Appwrite Storage
~~~
This means the client does not need to know or directly use Appwrite's internal IDs when requesting a file through the application API.
## File Listing
The protected file-listing endpoint is:
~~~http
GET /files
~~~
The endpoint must return only files belonging to the authenticated user.
~~~text
Authenticated User
       │
       ▼
Current User ID
       │
       ▼
Query files belonging to that user
       │
       ▼
Return only those files
~~~
It must not simply return every file stored in the system.
## Individual File Access
Individual file access is protected by both authentication and authorization.
~~~http
GET /files/:id
~~~
The server:
1. Authenticates the request.
2. Resolves the file using the application-level `fileID`.
3. Checks whether the file exists.
4. Verifies that the file belongs to the authenticated user.
5. Only then returns the file information.
~~~text
Request
  │
  ▼
Authenticate user
  │
  ▼
Resolve fileID
  │
  ├── Does not exist ──> 404
  │
  └── Exists
       │
       ▼
Check ownerID
       │
       ├── Different user ──> 403
       │
       └── Same user
              │
              ▼
          Allow access
~~~
Knowing another user's file ID must not be enough to access their file.
## `404` vs `403`
The application distinguishes between a file that does not exist and a file that exists but is not owned by the authenticated user.
### `404 Not Found`
A `404` response is appropriate when the requested file cannot be found.
For example:
~~~text
fileID = 676
metadata does not exist
      ↓
404 Not Found
~~~
### `403 Forbidden`
A `403` response is appropriate when the authenticated user is not allowed to access a resource.
For example:
~~~text
User A requests file 676
file 676 exists
owner = User B
      ↓
403 Forbidden
~~~
The important security property is that an authenticated user cannot access another user's file simply by knowing its identifier.
## File Download
The download flow resolves application metadata first and then finds the corresponding actual file in Appwrite Storage.
~~~text
GET /files/:id/download
          │
          ▼
Authenticate user
          │
          ▼
Resolve metadata using fileID
          │
          ▼
Verify ownership
          │
          ▼
Find actual Storage file
          │
          ▼
Generate Appwrite download URL
          │
          ▼
Trigger file download
~~~
The adapter's download logic follows this general sequence:
~~~typescript
const user = await account.get();
const file = await resolveFile(fileId);
~~~
Then ownership is verified:
~~~typescript
if (file.ownerId !== user.$id) {
  // reject access
}
~~~
The actual storage file is then resolved using the metadata stored for the file.
This ensures the application performs authorization before allowing the user to download the actual file.
## Appwrite Adapter
The application uses an Appwrite adapter to isolate provider-specific operations from the rest of the application.
The conceptual architecture is:
~~~text
Routes / Application Logic
          │
          ▼
      Appwrite Adapter
          │
          ▼
       Appwrite SDK
       ┌────┼────┐
       ▼    ▼    ▼
      Auth  DB  Storage
~~~
The adapter exposes application-level functions while hiding the details of the Appwrite SDK calls.
For example, the rest of the application can ask the adapter to resolve or download a file without needing to know every Appwrite Storage query involved.
### Why use an adapter?
The adapter provides a boundary between application logic and infrastructure.
Without an adapter, Appwrite-specific SDK calls could spread throughout the routes and business logic.
With an adapter:
~~~text
Application
    │
    ▼
Adapter
    │
    ▼
Appwrite
~~~
If the underlying service changes later, the provider-specific implementation can be changed inside the adapter rather than requiring changes throughout the application.
This also makes the application easier to maintain and test.
## Appwrite Responsibilities
| Responsibility | Appwrite | Application |
| --- | --- | --- |
| Authentication infrastructure | Yes | Integrates it |
| Session infrastructure | Yes | Uses/validates session identity |
| User account infrastructure | Yes | Registration/login flow |
| Database infrastructure | Yes | Metadata queries and business logic |
| File storage | Yes | File resolution and authorization |
| Input validation | No | Zod |
| HTTP API | No | Express |
| Authentication middleware | No | Application |
| User-data isolation | No | Application |
| File ownership checks | No | Application |
| Business logic | No | Application |
| API response handling | No | Application |
Appwrite provides infrastructure; it does not automatically make every application endpoint authorized.
The application still has to answer:
1. Who is making this request?
2. What resource are they requesting?
3. Does that resource belong to them?
## Adapter Modularization
The Appwrite adapter can be modularized further as the project grows.
A possible structure is:
~~~text
src/
└── lib/
    └── appwrite/
        ├── client.ts
        ├── auth.ts
        ├── database.ts
        └── storage.ts
~~~
A shared client can be created once and reused by the modules.
For example:
~~~text
client.ts
   │
   ├── auth.ts
   ├── database.ts
   └── storage.ts
~~~
This is preferable once the adapter becomes large enough that authentication, database, and storage functions are difficult to navigate in a single file.
The benefits are:
- Clear separation of responsibilities
- Easier debugging
- Smaller files
- Easier maintenance
- Easier testing of individual areas
- Less risk of unrelated changes affecting other functionality
The current implementation can remain functional as one adapter, but modularizing it is a reasonable next refactoring once the core assignment functionality is complete.
## Validation with Zod
Incoming data is validated at the API boundary using Zod.
~~~text
HTTP Request
     │
     ▼
Extract body/params
     │
     ▼
Zod schema
     │
     ├── Invalid ──> Reject request
     │
     └── Valid
           │
           ▼
      Application logic
~~~
This prevents malformed input from being passed directly into the rest of the application.
Validation is therefore performed before operations such as registration, login, or file resolution.
## Brute-Force Protection
Repeated failed login attempts should not be allowed indefinitely.
The application includes basic protection against repeated authentication attempts.
The purpose is to make automated brute-force attacks more difficult.
A production implementation could extend this with:
- Per-IP rate limits
- Per-account limits
- Progressive delays
- Temporary account/session lockouts
- Monitoring and alerting
The important requirement is that authentication endpoints should not be left completely unrestricted.
## Security Model
The overall authorization model is:
~~~text
                 ┌────────────────────┐
                 │   Incoming Request │
                 └─────────┬──────────┘
                           │
                           ▼
                 ┌────────────────────┐
                 │   Authentication   │
                 │   Is user logged  │
                 │      in?          │
                 └─────────┬──────────┘
                           │
                          YES
                           │
                           ▼
                 ┌────────────────────┐
                 │   Identification   │
                 │  Which user is     │
                 │  making request?   │
                 └─────────┬──────────┘
                           │
                           ▼
                 ┌────────────────────┐
                 │   Authorization    │
                 │  Can this user     │
                 │ access resource?   │
                 └─────────┬──────────┘
                           │
                          YES
                           │
                           ▼
                 ┌────────────────────┐
                 │   Resource Access  │
                 └────────────────────┘
~~~
The critical distinction is:
~~~text
Authenticated ≠ Authorized to access everything
~~~
A valid session proves who the user is. It does not automatically grant access to every file or every user's information.
## User Isolation
The project is designed to support multiple independent accounts.
For example:
~~~text
User A
├── Profile A
├── File A1
└── File A2
User B
├── Profile B
├── File B1
└── File B2
User C
├── Profile C
├── File C1
└── File C2
~~~
The expected authorization model is:
~~~text
User A → A's profile       ✓
User A → A's files         ✓
User A → B's profile       ✗
User A → B's files         ✗
User B → A's files         ✗
User C → A's files         ✗
~~~
The server enforces this isolation. The client is not trusted to hide unauthorized resources.
## Testing Client
The assignment supplies an `index.html` testing client.
The client provides controls for:
- Register
- Login
- Logout
- GET `/me`
- GET `/files`
- GET `/files/:id`
- Download `/files/:id`
- Supplying a session token when bearer authentication is being tested
- Cookie-based authentication
- Multiple seeded/test users
The client should be used for testing the backend rather than replacing it with a new GUI.
The client also supports mock and Appwrite-related configuration as provided by the assignment.
## Testing Flow
A basic authentication test:
~~~text
1. Register User A
        ↓
2. Login User A
        ↓
3. GET /me
        ↓
4. GET /files
        ↓
5. Access one of User A's files
        ↓
6. Logout
        ↓
7. Try GET /me again
        ↓
8. Request should be rejected
~~~
A cross-user authorization test:
~~~text
1. Login User A
        ↓
2. Obtain User A's file ID
        ↓
3. Logout
        ↓
4. Login User B
        ↓
5. Request User A's file ID
        ↓
6. Access should be rejected
~~~
The same process should be repeated with the third test user.
## Multi-User Test Matrix
| Test | Expected Result |
| --- | --- |
| User A registers | Success |
| User B registers | Success |
| User C registers | Success |
| User A logs in | Success |
| User B logs in | Success |
| User C logs in | Success |
| User A accesses own profile | Allowed |
| User B accesses own profile | Allowed |
| User C accesses own profile | Allowed |
| User A lists files | Only A's files |
| User B lists files | Only B's files |
| User C lists files | Only C's files |
| User A accesses A's file | Allowed |
| User A accesses B's file | Rejected |
| User B accesses A's file | Rejected |
| User C accesses A's file | Rejected |
| Logged-out user accesses `/me` | Rejected |
| Logged-out user accesses `/files` | Rejected |
| Logged-out user downloads a file | Rejected |
| Nonexistent file requested | 404 |
| Existing file owned by another user | 403 |
## Error Handling
The API uses HTTP status codes to communicate different classes of failure.
### `400 Bad Request`
Used for invalid or malformed request data where appropriate.
### `401 Unauthorized`
Used when the request does not have a valid authentication state.
Examples:
- Missing session
- Invalid session
- Expired/invalid authentication
### `403 Forbidden`
Used when the user is authenticated but is not allowed to access the requested resource.
Example:
~~~text
User A → User B's file
        ↓
403 Forbidden
~~~
### `404 Not Found`
Used when the requested resource does not exist.
Example:
~~~text
fileID does not exist
        ↓
404 Not Found
~~~
## Environment Variables
Configuration should be provided through environment variables rather than hard-coded credentials.
Create a `.env` file based on the project's environment configuration.
Typical configuration includes:
~~~env

DATABASE_URL=
PROJECT_ID=
PROJECT_ENDPOINT=
DATABASE_ID=
FILES_TABLE_ID=
BUCKET_ID=

~~~
The exact variable names used by the implementation should match the project's existing environment configuration.
Never commit real API keys, secrets, passwords, or other credentials to Git.
## Installation
### Prerequisites
- Bun
- An Appwrite project
- Appwrite authentication configured
- Appwrite database configured
- Appwrite Storage bucket configured
- Required environment variables
### Install Dependencies
~~~bash
bun install
~~~
### Configure Environment
Create the environment file and populate it with the required Appwrite and application configuration.
~~~bash
cp .env.example .env
~~~
On Windows, the file can also be copied manually.
### Start the Development Server
Use the project's configured Bun development script:
~~~bash
bun run dev
~~~
The backend will start on the configured local port.
## Design Decisions
### Session-based authentication
Sessions were selected because the assignment requires server-side invalidation on logout.
### HttpOnly cookies
HttpOnly cookies prevent client-side JavaScript from directly reading the session cookie.
### SameSite cookies
SameSite reduces the number of cross-site contexts in which authentication cookies are sent and helps mitigate CSRF-related attacks.
### Argon2
Argon2 provides modern memory-hard password hashing and avoids storing plaintext passwords.
### Generic authentication errors
Generic login failures prevent the API from unnecessarily revealing whether a particular email address is registered.
### Authentication middleware
Authentication is centralized in middleware so protected routes do not repeat session-validation logic.
### `req.user`
The authenticated user is attached to the request after session validation so protected handlers can use the established identity without performing the same lookup again.
### Selective user fields
User queries explicitly select safe fields rather than returning the complete database record, preventing sensitive fields such as password hashes from leaking.
### File ownership checks
A valid session does not automatically authorize access to every file. The application verifies that the requested file belongs to the authenticated user.
### Metadata/file separation
Metadata is stored in the database while actual file contents are stored in Appwrite Storage.
### Custom `fileID`
A custom application-level file identifier prevents the API from being tightly coupled to Appwrite-generated database and storage IDs.
### Appwrite adapter
The adapter keeps infrastructure-specific Appwrite operations separate from application-level logic.
## Potential Improvements
### Automated Tests
A larger automated test suite could cover:
- Registration
- Duplicate registration
- Successful login
- Failed login
- Logout
- Invalid/expired sessions
- Protected routes
- User isolation
- File-list isolation
- Individual-file ownership
- Nonexistent files
- Brute-force protection
### More Comprehensive Rate Limiting
Production-level authentication could use:
- Per-IP limits
- Per-account limits
- Progressive delays
- Temporary lockouts
- Monitoring of repeated authentication failures
### Structured Logging
Production deployments could add structured logging for:
- Authentication failures
- Session creation
- Session invalidation
- Authorization failures
- File-access attempts
- Appwrite failures
Sensitive values such as passwords, API keys, and session secrets must never be logged.
### Integration Testing
Integration tests could validate the complete request path:
~~~text
HTTP Request
     ↓
Express
     ↓
Authentication Middleware
     ↓
Application Logic
     ↓
Appwrite
     ↓
HTTP Response
~~~
### Production Hardening
Before public deployment, additional controls should be considered:
- HTTPS
- Secure cookies
- Strict CORS configuration
- Security headers
- Request-size limits
- Dependency auditing
- Secret rotation
- Monitoring
- Production-specific Appwrite permissions
## Assignment Requirement Mapping
| Requirement | Implementation |
| --- | --- |
| User registration | Implemented |
| Email/password authentication | Implemented |
| Password hashing | Argon2 |
| Session-based authentication | Implemented |
| Server-side logout invalidation | Implemented |
| Protected user profile | Implemented |
| Authentication middleware | Implemented |
| User isolation | Implemented |
| User-specific file listing | Implemented |
| Individual file access | Implemented |
| File ownership authorization | Implemented |
| Protected file download | Implemented |
| File metadata separation | Implemented |
| Appwrite Database integration | Implemented |
| Appwrite Storage integration | Implemented |
| Input validation | Zod |
| Generic login failures | Implemented |
| Brute-force protection | Implemented |
| Multiple-user testing | Implemented |
| Supplied testing client | Used |
## Security Summary
The core security model can be reduced to:
~~~text
Authentication
      ↓
Identify authenticated user
      ↓
Resolve requested resource
      ↓
Verify authorization/ownership
      ↓
Access resource
~~~
The application does not treat a file ID as proof of authorization.
It does not trust a client-provided user ID to determine ownership.
It does not expose password hashes through user responses.
It does not rely solely on deleting a client-side cookie to perform logout.
It uses server-side authentication state and application-level authorization to protect user resources.
## Conclusion
This project implements a complete authentication and file-access backend using Express, TypeScript, Bun, Appwrite, Zod, and Argon2.
The core flow is:
~~~text
Register
   ↓
Authenticate
   ↓
Create Session
   ↓
Authenticate Protected Requests
   ↓
Identify Current User
   ↓
Authorize Resource Access
   ↓
Access Own Data/Files
   ↓
Logout
   ↓
Invalidate Session
~~~
The central security principle of the project is:
~~~text
Authentication → Identification → Authorization → Resource Access
~~~
A user being authenticated proves who they are. It does not automatically give them access to every resource in the system. Every user-owned resource must still be checked against the authenticated identity.
