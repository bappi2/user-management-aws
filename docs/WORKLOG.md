# Work Log: user-management-aws

A review log of what was built, how, what went wrong, and what was learned.
Current decisions and next step live in [CLAUDE.md](../CLAUDE.md); this file is the history.

---

## Timeline (commits)

| Commit | Phase | Summary |
|---|---|---|
| `626ed9c` | 1.2 | CDK app with stage config and DynamoDB single-table |
| `af7ebc8` | 1.3 | Placeholder Node Lambda + REST API `/v1/users` (register, profile) |
| `2d30f1d` | | Add CLAUDE.md, remove `cdk init` example files |
| `90622c1` | | Track placeholder Lambda source (`!lambda/**/*.js` gitignore exception) |
| `5b28f9e` | 1.3b | API Gateway request validation (Evently rules) + Problem Details gateway response |
| `86bbed0` | | Validate `USER_MGMT_ACCOUNT` format (12 digits) |
| `38fc803` | 1.4 | Java 21 Lambda (router, 3 endpoints, DynamoDB repository, tests), arm64, SnapStart + priming |
| `9d2d111` | | Remove placeholder Lambda and its gitignore exception |
| `1155a8b` | 1.5 | Cognito User Pool + authorizer, sign-up via Cognito + PostConfirmation trigger, `/register` removed, IAM narrowed |
| `35d8779`, `170bf1b` | | Work log, architecture diagram, link from CLAUDE.md |
| `31c5564` | 2.1 | Vite + React + TypeScript app shell in `apps/web` |
| `62986b4` | 2.2 | CORS (preflight, Lambda origin echo, gateway responses) + frontend config from stack outputs |
| `c959d1e` | 2.3 | Amplify auth: sign up, confirm code, sign in (SRP), sign out |
| `c507fc1` | 2.4 | Profile page: GET/PUT with ID token, Problem Details errors, session-expired handling |
| `29450fe` | 2.5 | S3 + CloudFront hosting (OAC, security headers, cache rules, SPA fallback) + runtime `config.json` |
| `7e64e44` | | Docs: Phase 2 decisions, work log, architecture diagram |
| `8918add`, `f566ae8` | 3.0 | Diagram: pipeline planned (two accounts drafted, then single account) |
| `bca92a4` | 3.2 | `UserManagementStage` wraps the stack (pipeline-ready) |
| `1abf593` | 3.3 | CDK pipeline: GitHub source, synth React + Java + CDK, beta stage |
| `6953e62` | 3.4 | Post-deploy smoke test for beta |
| `b1427a2` | 3.5 | Manual approval + prod stage with smoke test |

---

## Setup (before Phase 1.2)

- Tools: Node 26, npm 11, CDK CLI 2.1148, AWS CLI 2, JDK 27 (Homebrew), Maven 3.9.16
- AWS account 456423665721, region **us-west-2**; CDK already bootstrapped there (`CDKToolkit` stack)
- The original brief said us-east-1 by mistake; corrected to us-west-2 to match the bootstrap and code
- Repo pushed to GitHub (`origin` = HTTPS remote). Repo turned out to be **public**, so account-ID exposure was discussed
  (an account ID isn't a secret, but it was moved to an env var anyway)

---

## Phase 1.2: CDK app + DynamoDB table

**Goal:** `cdk init`, config files, a stack with the pk/sk table; deploy beta, test, destroy.

**What was done**
- `npx cdk init app --language typescript` in `infra/`
- `infra/config/types.ts` (`Stage`, `StageConfig`) + `infra/config/environments.ts` (`STAGES: Record<Stage, StageConfig>`)
- `infra/lib/user-management-stack.ts` with `dynamodb.TableV2`: `usermanagement-${stage}`, pk/sk, GSI1, on-demand,
  `RemovalPolicy.DESTROY`
- `infra/bin/infra.ts` loops over stages → `UserManagement-beta`, `UserManagement-prod`; tags Project/Developer/ManagedBy/Stage
- Compared with the old project's `stack-config-types.ts` (bappi2/cdk-ts-api-gateway): kept the per-stage config pattern
  and borrowed its nested per-resource settings (`lambda: {...}`, `api: {...}`) later

**Results**
- `cdk synth` → `AWS::DynamoDB::GlobalTable` (TableV2 is built on global tables), `DeletionPolicy: Delete`, tags on the replica
- Deployed, `put-item` / `get-item` worked, GSI1 query by `EMAIL#...` worked (sparse index), destroyed → `ResourceNotFoundException`

**Problems and fixes**
- `npm warn install-scripts`: npm 11 blocks install scripts until approved; the binaries worked without approving anything
- `zsh: command not found: #`: zsh treats pasted `#` comments as commands → fixed later with `setopt interactivecomments`
- Example files `lib/infra-stack.ts` / `test/infra.test.ts` were committed by accident and removed in a later commit

**Lessons**
- `synth` is local; `diff` uses a change set; `deploy`/`destroy` change AWS. Always name the stack.
- **Logical IDs must stay stable** (renaming a construct ID → CloudFormation replaces the resource and its data)
- Single-table: generic pk/sk, sparse GSI, `query` not `scan`; `Count` vs `ScannedCount`
- Check commits with `git show --stat HEAD`; a clean `git status` doesn't prove a file was committed

---

## Phase 1.3: Placeholder Lambda + API Gateway

**Goal:** prove the API Gateway → Lambda → IAM wiring before Java.

**Design input:** reviewed Evently (bappi2/evently7, Users module): `RegisterUser` (anonymous), `GetUserProfile` and
`UpdateUserProfile` (user ID from JWT claims, no `{id}` in the URL → no IDOR), Problem Details errors.
Routes chosen: `POST /v1/users/register`, `GET/PUT /v1/users/profile`.

**What was done**
- Config: `lambda: { memorySize, timeoutSeconds }`, `api: { throttleRateLimit, throttleBurstLimit }`
- `infra/lambda/placeholder/index.js` (plain JS router, Problem Details errors), `Code.fromAsset`
- Own `LogGroup` (1-week retention, destroyed with stack), `TABLE_NAME` env var, `grantReadWriteData`
- `RestApi` with stage = `config.stage`, throttling, `LambdaIntegration` (proxy)
- Discussed JS vs TS for the placeholder: plain JS (A), `tsc` → dist (B, the old project's approach), `NodejsFunction` (C).
  Chose A because the file is throwaway.

**Results**
- All routes worked; unknown routes → API Gateway `403 "Missing Authentication Token"` (Lambda never invoked)
- Logs: cold start `Init 202 ms`, warm 2–3 ms, 73 MB used

**Problems and fixes**
- Tested old CRUD routes against new routes → all 403 (wrong paths, not a bug)
- **`index.js` was not committed**: cdk init's `.gitignore` has `*.js` → added `!lambda/**/*.js`
- The first `.gitignore` edit wasn't saved → used `sed -i ''` instead
- Earlier a `.zshrc` line merge broke things (see 1.3b)

**Lessons**
- Proxy integration contract: `{statusCode, headers, body(string)}`; a wrong shape → 502
- `event.resource` = route template (stable router key)
- API Gateway's "Missing Authentication Token" usually means "no such route"
- Two request IDs (API Gateway vs Lambda) → log both for correlation

---

## Phase 1.3b: Request validation

**Goal:** reject bad requests at the edge, like the old project's validators.

**What was done**
- `api.addRequestValidator` (body only), models `RegisterUserRequest` (required fields, email pattern, password ≥ 6,
  `additionalProperties: false`) and `UpdateUserProfileRequest`
- `addGatewayResponse(BAD_REQUEST_BODY)` → Problem Details (`$context.error.messageString`)

**Results**
- Valid → Lambda 200; missing field / extra field → 400 Problem Details; logs showed **only 1 Lambda invocation**

**Problems and fixes**
- `There is already a Construct with name 'GET' in ... [profile]`: new methods added without deleting the old ones
- **Account ID became `456423665721setopt`**: `.zshrc` had no trailing newline, so `echo ... >> ~/.zshrc` merged
  two lines → split them; `environments.ts` guard now checks `/^\d{12}$/`
- The beta stack was nearly left running → checked and destroyed

**Lessons**
- Edge validation = cheap shape checks; Java = authoritative rules (defense in depth)
- Validate config format, not just presence
- Read stack traces from the first line that points at *your* file

---

## Phase 1.4: Java Lambda (services/user-api)

### 1.4a: Maven project, router, endpoints, tests
- `pom.xml`: `maven.compiler.release 21` (JDK 27 builds Java 21 bytecode), AWS SDK BOM, lambda-java-core/events,
  DynamoDB with Apache/Netty excluded + `url-connection-client`, Jackson, JUnit; shade plugin → `target/user-api.jar`
- `http/`: `ProblemDetails`, `ApiException`, `Json`, `HttpResponses`, `Validation`, `RequestIdentity` (fail closed → 401)
- `users/`: `User`, `UserRepository`, `RegisterUser`, `GetUserProfile`, `UpdateUserProfile` (Evently file names)
- `ApiHandler` (router, catches `ApiException` vs unexpected errors), `Endpoint` (≈ `IEndpoint`)
- Tests: `InMemoryUserRepository`, `ApiHandlerTest` → **8 tests passed**; JAR 9.9 MB, bytecode major 65 (Java 21),
  no JUnit/Apache/Netty inside

### Side discussions
- **Spring Boot on Lambda:** possible (Serverless Java Container / Spring Cloud Function) but slow cold starts;
  plain Java chosen for learning; Micronaut/Quarkus as lighter options
- **Best practices review:** applied (init outside the handler, small deps, least privilege, no leaked errors, log
  retention); added later (arm64, SDK timeouts, LambdaLogger, tiered compilation, SnapStart); backlog (Powertools)
- **HTTPS:** already HTTPS-only (execute-api, SDK → DynamoDB); a custom domain + ACM is optional, planned with the frontend

### 1.4b: DynamoDB repository
- `DynamoDbUserRepository`: register = `TransactWriteItems` (`USER#id/PROFILE` + `EMAIL#email/EMAIL`, both
  `attribute_not_exists`), `GetItem` with consistent read, `UpdateItem` with `attribute_exists`
- `AwsClients`: explicit region, `DefaultCredentialsProvider` (SnapStart-safe), url-connection client, timeouts 3 s / 1 s
- `ApiHandler` no-arg constructor (Lambda) + `requireEnv`; `log(context, ...)` via LambdaLogger (multi-line safe)

### 1.4c: Deploy the JAR
- Stack: `JAVA_21`, `ARM_64`, handler `com.usermanagement.api.ApiHandler::handleRequest`, `Code.fromAsset(jar)`,
  1024 MB, `JAVA_TOOL_OPTIONS=-XX:+TieredCompilation -XX:TieredStopAtLevel=1`, `LoggingFormat.JSON`
- Placeholder removed
- Reviewed the IAM diff (invoke permissions per method + test-invoke-stage; `grantReadWriteData` wider than needed)
- Results: register 200, duplicate email (different case) 409, scan showed both items, `lambda invoke` with fake claims
  for GET/PUT profile, update confirmed in DynamoDB
- **Cold start:** init 1318 ms + first request 2260 ms (lazy class loading, TLS, credentials); warm 4–100 ms

### 1.4d: SnapStart
- Log levels (`LogLevel.INFO/ERROR`), CRaC priming (`beforeCheckpoint` → read-only GET profile), `org-crac` dependency
- `snapStart: ON_PUBLISHED_VERSIONS`, `lambda.Alias('live', currentVersion)`, integration → alias

| Run (5 parallel cold starts) | Startup | First request | Billed | Client |
|---|---|---|---|---|
| No SnapStart | init ~1250 ms | ~2200 ms | ~3450 ms | ~4.4 s |
| SnapStart, no priming | restore 795 ms | 3662 ms | 3890 ms | ~3.6 s |
| SnapStart + priming | restore ~850 ms | ~1500 ms | ~1800 ms | ~3.0 s |

**Problems and fixes**
- 5× 500 right after deploy: tested **while the deploy was still running** (alias/permissions switching)
- Priming didn't run: `Core.getGlobalContext().register(this)` was missing; logs had no priming line
- Edit not saved → rebuilt unchanged code and skipped the deploy
- zsh `$RANDOM` in `( ... )` subshells repeats values → duplicate emails → 409; switched to `uuidgen`
- Placeholder cleanup commands skipped → separate cleanup commit

**Lessons**
- SnapStart needs published versions → alias; code before the snapshot runs once (priming must be read-only)
- Without priming, SnapStart can be worse for SDK-heavy Java
- Wait for ✅ before testing; production uses gradual (canary) deploys

---

## Phase 1.5: Cognito

### 1.5a: User Pool + authorizer
- `UserPool`: email sign-in, case-insensitive, required `given_name`/`family_name` (immutable after creation),
  password policy 8+ upper/lower/digit, EMAIL_ONLY recovery
- App client: no secret, SRP + USER_PASSWORD (CLI testing), `preventUserExistenceErrors`, 1 h tokens
- `CognitoUserPoolsAuthorizer` on GET/PUT `/profile`; gateway responses UNAUTHORIZED (401) and ACCESS_DENIED (403)
- Tests: no token → 401 (gateway); `admin-create-user` + `admin-set-user-password`; `initiate-auth` → ID token;
  decoded JWT (`sub`, `iss`, `aud`, `token_use: id`, 1 h expiry); valid token → **404 Users.NotFound** (auth works,
  no profile yet); tampered token → **403** (not 401 as first predicted)

### 1.5b: Registration design decision
- **Option A** (through the API, like Evently: Lambda → AdminCreateUser + DynamoDB) vs
  **Option B** (Cognito SignUp + ConfirmSignUp, PostConfirmation trigger writes the profile)
- **Chose B:** password never touches our code, built-in email verification, no two-system write problem,
  fits Amplify/React

### 1.5b: Implementation
- Java: `RegisterUser` deleted; `PostConfirmationHandler` (only `PostConfirmation_ConfirmSignUp`, returns the event,
  read-only priming); `insert` = `PutItem` + `attribute_not_exists` (idempotent); `EMAIL#` item removed (Cognito owns
  uniqueness); `AwsClients` public + shared `requireEnv`; **11 tests**
- CDK: self sign-up + email code; shared `javaFunctionProps`; trigger function (5 s timeout, SnapStart, alias,
  `addTrigger`); IAM narrowed (API: GetItem + UpdateItem; trigger: PutItem + GetItem); `/register` route + model removed
- **End-to-end:** sign-up → emailed code → confirm → profile `USER#<sub>` created → sign-in → GET 200 → PUT 204 → GET
  shows the update. Trigger: restore 796 ms + 1054 ms (1.3 s billed, under the 5 s limit)

**Problems and fixes**
- `RegisterUser.java` was commented out (`/* ... */`) instead of deleted → "file does not contain class"
- `ApiHandler` constructor lost its `AwsClients.dynamoDb()` argument → "argument lists differ in length"
- **Removed `/register` still returned 500:** the Deployment snapshot was taken before CloudFormation's cleanup deleted
  the old Method. Confirmed with `get-export` on the stage; fixed with `aws apigateway create-deployment`;
  needed a few seconds to propagate
- Side finding: request models are per Content-Type; `curl -d` without a JSON header skipped validation

---

## Phase 2: React frontend

### 2.1: App shell
- `npm create vite@latest web -- --template react-ts` in `apps/` (create-vite 9; chose **ESLint** over Oxlint for the
  `react-hooks` rules); React 19.3, Vite 8.3, TypeScript 6.0, ESLint 10
- Replaced the starter with a shell: `type Page` union, `useState`, props, `className`
- Learned: component, JSX, state, props, single-page app, hashed file names in `dist/` (safe long caching)
- `npm audit` reported moderate issues: all one `minimatch` DoS via `typescript-eslint` (lint only, never shipped);
  npm's "fix" was a **downgrade** → did NOT run `npm audit fix --force`

### 2.2: CORS + frontend config
- CORS needed from **three** response sources: API Gateway preflight (`defaultCorsPreflightOptions`), the Java Lambda
  (`ApiHandler.withCors` echoes allowed `Origin` + `Vary: Origin`), and gateway error responses (`*`, incl. new
  `DEFAULT_4XX` / `DEFAULT_5XX`)
- Config: `web.allowedOrigins` per stage; `ALLOWED_ORIGINS` env var on the API function only (spread
  `...javaFunctionProps.environment` so shared vars aren't replaced)
- `scripts/env-from-stack.sh` writes `.env.local` (ignored via `*.local`) from stack outputs; `vite-env.d.ts` types the
  `VITE_*` vars; `config.ts` fails fast on missing values
- Results: preflight 204 with the origin, gateway 401 with `*`, browser `fetch` read the 401 Problem Details

**Problems and fixes**
- `cannot find symbol: parseOrigins`: helpers not added yet
- Two methods named `handleRequest` (public + private) → renamed the old one to `route()` (access modifier doesn't
  make a different method)
- `mvn package` failed but `cdk deploy` ran anyway (chained without `&&`) → would have deployed the old JAR
- Console snippet used `import.meta` → `SyntaxError` (only valid inside modules); used a plain URL instead
- Red `GET ... 401` line in the console is just Chrome logging a failed status, not a CORS error

### 2.3: Amplify auth (option A chosen over hosted UI / low-level SDK)
- `npm install aws-amplify`; `auth.ts` → `Amplify.configure` with our pool + client (no Amplify CLI/backend)
- Components: `SignUpForm`, `ConfirmSignUpForm`, `SignInForm`, `SignedIn`; `App.tsx` view = discriminated union
- Learned: controlled inputs, `preventDefault`, `busy` state, `useEffect` + cleanup (`active` flag, StrictMode
  double-mount), fragments, `type` imports (`verbatimModuleSyntax`), `nextStep.signInStep` (`CONFIRM_SIGN_UP`)
- Verified: Network tab shows `USER_SRP_AUTH` + `PASSWORD_VERIFIER`, **password not in the payload**; session survives
  reload (tokens in localStorage); trigger created `USER#<sub>`
- Bundle grew 220 KB → 354 KB (106 KB gzipped) with Amplify auth

### 2.4: Profile page
- `api.ts`: `fetchAuthSession()` before each call (auto-refresh), raw ID token in `Authorization`,
  `new URL('v1/users/profile', apiUrl)` (no leading slash keeps `/beta/`), `ApiError` with Problem Details,
  `isAuthError` = 401 or 403
- `ProfilePage.tsx`: load once, save + read back, field errors list, session expired → sign out with message
- Two validation layers visible in one form: empty name → API Gateway model 400; single space → Java `notBlank`
  with per-field `errors[]`
- Verified: DynamoDB `updatedAt` changed; logs showed the PUT followed by a GET

**Problems and fixes**
- `npm run build` in the repo root → `ENOENT package.json` (run npm in `apps/web`)
- Several GETs in the logs: one per page load / sign-in, plus StrictMode mounting twice in dev

### 2.5: S3 + CloudFront hosting
- Private bucket (`BLOCK_ALL`, `enforceSSL`, `autoDeleteObjects`) + CloudFront with **Origin Access Control**
- `ResponseHeadersPolicy`: HSTS, CSP, `X-Frame-Options: DENY`, nosniff, referrer policy
- Two `BucketDeployment`s: hashed assets cached 1 year (`immutable`); `index.html` + `config.json` `no-cache` and
  invalidated on deploy
- **Runtime config:** CDK writes `/config.json` with deploy-time values (`Source.jsonData`), app loads it in
  `loadConfig()` before configuring Amplify → same `dist/` for every stage (solves the build-vs-deploy chicken-and-egg)
- CORS origins = localhost + CloudFront URL token (CDK renders exact-match checks for extra origins)
- Verified: `no-cache` on entry files, `max-age=31536000, immutable` on JS, security headers present, http → 301,
  direct S3 → 403, SPA fallback 200, preflight from the CloudFront origin 204, `ALLOWED_ORIGINS` resolved
- `npm run preview` locally shows "Could not load /config.json": proof the production build reads config at runtime
- First deploy ~5 min (new distribution); destroys are slower now (CloudFront must disable first)

---

## Phase 3: CDK pipeline

Goal: `git push` builds React + Java, deploys beta, smoke-tests it, waits for approval, deploys prod.

### 3.0: Where the pipeline lives, how many accounts
- **Pipeline in `infra/`, not `platform/`:** CDK Pipelines deploys `Stage` objects, so the pipeline and the stacks
  must be in the same CDK app. A separate app importing `../infra/lib` would load two copies of `aws-cdk-lib`
- **Accounts:** discussed the AWS best practice (management / tooling / beta / prod), then a two-account
  compromise (current account = pipeline + beta, new prod account). `aws organizations list-accounts` →
  `AWSOrganizationsNotInUseException` (no org yet). Decision: **stay in one account while learning**; the diagram was
  redrawn for a single account. Later path is in CLAUDE.md (bootstrap `--trust`, `crossAccountKeys: true`)

### 3.1: GitHub connection
- Console → CodePipeline → Settings → Connections → GitHub → install the AWS Connector app on this repo only
- `aws codeconnections list-connections` → `user-management-github` **AVAILABLE**
- The ARN isn't secret; `infra/config/pipeline.ts` builds it from the account variable (no account ID in code)

### 3.2: Stage refactor
- `infra/lib/user-management-stage.ts`: `UserManagementStage extends Stage`, creates the stack with
  `stackName: UserManagement-${stage}` (without it CDK would create a NEW stack named after the path) + tags
- `cdk list` → `beta/UserManagement (UserManagement-beta)`
- **Problem:** `cdk diff` showed `[-]`/`[+]` on 4 Lambda permissions + the API Deployment, and `[~]` on the CloudFront
  origin Id and bucket tags. I had said "any `[-]`/`[+]` is bad", which was too strict. **Cause:** these names are
  built from the full construct path (`UserManagementbetaApi…` → `betaUserManagementApi…`). **Fix:** none needed;
  nothing stateful is replaced. Real rule: red flag only if table / user pool / bucket / distribution is replaced
- Deployed from the laptop (116 s) so a refactor problem couldn't be confused with a pipeline problem.
  Smoke-checked: web 200, config.json 200, api 401, preflight 204; URLs unchanged
- CLI shows outputs as `betaUserManagement060CF9C8.ApiUrl`: only the display name; CFN output keys are unchanged,
  so `env-from-stack.sh` still works

### 3.3: Pipeline stack
- `infra/lib/pipeline-stack.ts`: `CodePipelineSource.connection`, `CodePipeline` (V2, `crossAccountKeys: false`),
  `ShellStep('Synth')` with subshell commands for npm / Maven / cdk synth, `primaryOutputDirectory: infra/cdk.out`,
  `synthCodeBuildDefaults` with STANDARD_7_0 + `runtime-versions` nodejs 22 / corretto21, `env: USER_MGMT_ACCOUNT`
- `bin/infra.ts` now creates only `UserManagement-Pipeline`; beta lives inside it
- The construct path changed once more (`UserManagement-Pipeline/beta/…`): same harmless diff as 3.2 (I should have
  warned about it in 3.2)
- **Problem:** `get-pipeline-state` → `PipelineNotFoundException`. **Cause:** files not yet committed, local `main` 3 commits
  ahead, `cdk deploy` not run. **Fix:** commit + push first (`git status -sb` with no "ahead"), then deploy
- `npx cdk deploy UserManagement-Pipeline` (64 s, IAM approval prompt). First run succeeded on its own:
  Source → Synth (`vite build`, **Tests run: 13, Failures: 0**, `BUILD SUCCESS`; ~3 min) → SelfMutate (no change) →
  Assets (7: JAR, dist/, index.html + config.json, helper Lambdas) → beta. Smoke checks unchanged

### 3.4: Beta smoke test + self-mutation
- Stack keeps `public readonly webUrl/apiUrl: CfnOutput` (same construct IDs → no template change)
- `pipeline.addStage(beta, { post: [ShellStep('SmokeTest', { envFromCfnOutputs, commands }) ] })`; each check is
  `[ "$(curl -s -o /dev/null -w "%{http_code}" …)" = "200" ]` → non-zero exit fails the step
- Pushed without `cdk deploy`. Execution history: run on `6953e62` **Cancelled** (WebhookV2) → SelfMutate updated the
  pipeline → new run on the same commit (StartPipelineExecution) **Succeeded**. SmokeTest log showed the real URLs

### 3.5: Approval + prod
- Smoke test moved into a `smokeTest(stage)` function; prod stage with `pre: ManualApprovalStep('PromoteToProd')` and
  `post: smokeTest(prod)`
- New asset `WebEntry_Asset22` = prod's own `config.json` (same `dist/`, different runtime config)
- Approved in the console → `UserManagement-prod` CREATE_COMPLETE: table `usermanagement-prod`, new user pool,
  API stage `/prod`, new CloudFront URL. Prod SmokeTest passed; the prod site footer shows `stage: prod`
- **Finding:** the approval was made as the **root user** (`Approved by …:root`). Added to the backlog as HIGH
- **Finding:** prod preflight from `http://localhost:5173` returns 204 too, but `Access-Control-Allow-Origin` is the
  prod CloudFront URL → the browser blocks it. CORS is enforced by the browser comparing the header

### 3.7: Trying the pipeline
- Prod sign-up (`+umtest3` Gmail alias, prod has its own pool): PostConfirmation wrote `USER#<sub>/PROFILE` to
  `usermanagement-prod` (`createdAt == updatedAt`). Profile save in the prod site → `lastName` changed, `updatedAt` later
  than `createdAt` (PUT → authorizer → Lambda → conditional UpdateItem)
- Before breaking: recorded `LastUpdatedTime` of both stacks (beta 2026-11-17, prod 2026-11-18)
- Broke `ApiHandlerTest.profileWithoutIdentityReturns401` (401 → 418). Docs commit + break commit, **one push** (the
  pipeline builds HEAD only, so the docs commit never ran alone)
- Synth failed in `mvn -B package`: `expected: <418> but was: <401>`, `Tests run: 13, Failures: 1`, `BUILD FAILURE`,
  exit status 1 → `cdk synth` never ran. UpdatePipeline/Assets/beta/prod kept the previous execution ID; both stacks'
  `LastUpdatedTime` unchanged
- `git revert HEAD` + push → green through beta (SmokeTest passed) → approved PromoteToProd (as root again) → prod
  Deploy + SmokeTest green
- **Learned:** stages show the last execution that *reached* them; the approver's ARN is recorded on the action
- **Decision:** from 4.1 on, work on `feature/*` branches; merging to `main` = deploy. Considered disabling the
  Source → Build transition to batch pushes: works, but saves only cents per run
- **Backlog:** V2 trigger file-path filter so docs-only pushes (`docs/**`, `*.md`) don't run the pipeline

---

## Phase 4: Reusable starter (landing, social login, tiers, sidebar)

Goal: a foundation for a future app (product idea not decided yet). Work happens on `feature/*` branches.

### 4.1a: Router with the same behaviour
- `npm install react-router` (v8.5.2; checked the tarball: `react-router-dom` removed in v8, declarative APIs still
  there). `BrowserRouter` in main.tsx; the `View` union became routes `/login`, `/signup`, `/confirm?email=`, `/app`
- Forms unchanged (callback props); only the wiring moved from `setView` to `navigate()`
- `encodeURIComponent(email)`: in a query string `+` means space, so `bappi2+alias@…` would break confirm
- **Mistake:** `BrowserRouter` landed in the `.catch` branch → `.then` rendered App without a router → `useNavigate()`
  threw → blank page. TypeScript hinted (`'error' is declared but never read`)

### 4.1b: AuthContext + guards
- Checked Amplify 6.22.2 source: signInWithSRP / confirmSignIn / completeOAuthFlow dispatch Hub `signedIn`, signOut
  dispatches `signedOut` → AuthProvider derives `status` from Hub, no manual `setSignedIn`
- Split `authContext.ts` (context + `useAuth`) and `AuthProvider.tsx` (component only): react-refresh lint rule
- RequireAuth (signed out → /login with `state.from`) + GuestOnly (signed in → `from` or /app) as layout routes
- Not handling `tokenRefresh_failure` (also fires on network blips; real expiry ends in API 401 → signOut)
- **Mistake:** guards used in App.tsx without importing them → ReferenceError → blank page. `npm run dev` doesn't
  type-check; `npx tsc -b` showed `Cannot find name 'GuestOnly'`
- "localhost refused to connect" = dev server not running (stopped to run git in the same terminal) → two terminals

### 4.1c: App layout with sidebar
- AuthLayout (old centered card) and AppLayout (CSS grid sidebar + `<Outlet />`, top bar under 640px)
- `NavLink` adds `class="active"`; `end` on Home so `/app` isn't active on `/app/profile`
- Session-expired message moved into the context: `signOut(message)` stores it before Amplify signOut, RequireAuth
  passes it to /login (fixes the race between Hub redirect and the page navigating itself)
- `useCallback` for `signOut` and the ProfilePage handler: effect deps compare functions by identity
- `SignedIn.tsx` split into HomePage (claims), AppLayout (sign out), ProfileRoute (session expired)
- **Mistakes:** `ProfileRoute` defined inside `App` (component inside component = remount every render);
  HomePage created under `src/auth/pages/` (wrong folder → Vite "Failed to resolve import")

### 4.1d: Public side
- PublicLayout (header: Log in / Sign up, or Open app; nothing while `loading` to avoid a flash), LandingPage (hero +
  feature cards from an array), PrivacyPage (template, true for the current stack; needed for Google's consent screen),
  NotFoundPage (`*` in PublicLayout, also catches `/app/nope`)
- Auth route components moved to `pages/`; `components/ProfilePage` renamed `ProfileForm`; `pages/app/ProfilePage`
  is the wrapper. App.tsx = the whole site map. `src/brand.ts` APP_NAME
- CSS: `repeat(auto-fit, minmax(220px, 1fr))` cards, `clamp()` headline, sticky footer via flex column
- **Mistake:** renamed the file `ProfileForm.tsx` but not the exported function → `no exported member 'ProfileForm'`

### 4.1e: Merge + deploy
- Fast-forward `main` (7d5e873..0244027), one pipeline run. Beta and prod: `/`, `/privacy`, `/app/profile` all 200
  (CloudFront SPA fallback serves index.html, the router picks the page). Prod approved, SmokeTest green

### 4.2a: Forgot password
- Branch `feature/4.2-auth-card`. `resetPassword({ username })` → nextStep `CONFIRM_RESET_PASSWORD_WITH_CODE` → email
  code; `confirmResetPassword({ username, confirmationCode, newPassword })`; "Resend code" calls resetPassword again
- ForgotPasswordForm / ResetPasswordForm in `components/`, pages navigate `/forgot-password` → `/reset-password?email=`
  → `/login` with state message "Password changed…"
- preventUserExistenceErrors: unknown emails also "succeed" → UI says "If an account exists…"
- Cognito fires PostConfirmation with `PostConfirmation_ConfirmForgotPassword`; the Java trigger ignores it (tested)
- `/reset-password` without `?email=` → `<Navigate to="/forgot-password" replace />` (the form needs the username;
  `replace` so Back doesn't bounce into the redirect again). Same pattern as ConfirmPage → /signup

### 4.2b: Auth card
- AuthLayout: grey page + centred white card (max 400px). Tabs and Google button live in LoginPage/SignUpPage, not
  the layout, because confirm/forgot/reset share the layout but shouldn't show them
- AuthTabs = two `NavLink`s with `replace`: the tab is the URL (reload and deep links keep it, Back leaves in one step)
- SocialButtons: Google button (inline SVG logo, CSP-safe, `type="button"`, disabled "Coming soon") + "or" divider
  drawn with `::before`/`::after` flex lines. `<h2>` removed from SignInForm/SignUpForm (tabs say it)
- CSS scoped to `.auth-card .form button[type="submit"]` so ProfileForm and "Resend code" aren't affected;
  `font: inherit` before `font-weight` (shorthand resets it)
- Merged with docs (e262af1), beta: all 8 checks incl. real forgot-password email; prod approved. Pipeline built the
  same asset hashes as the local build (Vite names files by content hash)

### 4.2c1: Cognito domain
- Branch `feature/4.2c-google`. OAuth (social sign-in) works with browser redirects, so Cognito needs a web address:
  `userPool.addDomain` with `cognitoDomain.domainPrefix` from config (`auth.domainPrefix`; globally unique per region,
  checked free with `dig`). `CLASSIC_HOSTED_UI` (never shown; works on every feature plan). Output `AuthDomainUrl`
- Deployed alone first so the URL existed before Google setup. Verified: `describe-user-pool-domain` ACTIVE, DNS resolves

### 4.2c2: Google OAuth client
- New Google Cloud project `user-management` ("free trial is over" banner is irrelevant: OAuth is always free)
- Google Auth Platform: External audience, Testing mode, my Gmail as test user; branding left empty (the privacy URL is on
  cloudfront.net, which can't be verified as mine → needed only for publishing)
- Web client with JavaScript origins = both Cognito domains, redirect URIs = both + `/oauth2/idpresponse`. Google talks
  only to Cognito, never to the app → one client serves beta and prod
- **Mistake:** pasted the redirect URI into the origins box → "URIs must not contain a path". Origin = scheme + host;
  redirect URI = exact string (typo → `redirect_uri_mismatch`)
- Google shows the client secret only once (downloaded JSON)

### 4.2c3: Client secret (free)
- Planned Secrets Manager (~$0.40/month). Switched to SSM Parameter Store **String** (standard tier, free):
  `ssm-secure` dynamic references only work for a short list of properties (not Cognito IdP), and Cognito returns the
  secret via DescribeIdentityProvider anyway, so Secrets Manager adds little in a one-person account
- `put-parameter --value "$(jq -r .web.client_secret "$F")"` straight from the downloaded JSON (no copy/paste, not in
  history), checked with `awk` (prefix + length only), then deleted the JSON

### 4.2c4: Google IdP + OAuth client settings
- `UserPoolIdentityProviderGoogle`: `clientSecretValue: SecretValue.cfnDynamicReference(new CfnDynamicReference(SSM, name))`
  → template has `{{resolve:ssm:…}}`, 0 hits for the secret in cdk.out. Scopes openid/email/profile (CDK default is
  only profile → no email). Mapping email, email_verified, given_name, family_name (pool requires the names)
- App client moved below the distribution (callback URLs need the CloudFront URL); same construct ID `WebClient` →
  same client, in-place update. COGNITO + Google, code flow only, callback `/auth/callback`, logout `/login`,
  `addDependency(googleProvider)` (client names "Google" only as a string)
- Diff surprises: CDK had silently set OAuth defaults (`https://example.com`, implicit flow, all scopes). Kept
  `aws.cognito.signin.user.admin` (deleteUser etc. for Google users). JAR hash changes on every `mvn package`
  (timestamps) → new Lambda versions each deploy; harmless, backlog item
- CSP connect-src + `https://*.amazoncognito.com` (Amplify fetches `/oauth2/token`; navigations aren't connect-src)
- **Mistakes:** first diff had no ResponseHeadersPolicy change (CSP edit not made yet); second still dropped the admin
  scope (edit not made). The diff showed both → always check the diff for every intended change
- Deployed (one run with docs). First raw-URL try → Cognito "An error was encountered with the requested page": too
  early, the run was still at UpdatePipeline (no IdP in the pool yet). The reason is in the address bar (`?error=`), not
  in the page HTML
- Backend test without React: `/oauth2/authorize?identity_provider=Google&…&redirect_uri=http://localhost:5173/auth/callback`
  → Google (shows the Cognito domain as app name: unverified branding) → consent (name, picture, email) →
  `localhost:5173/auth/callback?code=…` (404 page, fine). Cognito user `google_<google id>`, EXTERNAL_PROVIDER,
  email_verified true, names mapped. **PostConfirmation fires on the first federated sign-in** (log "profile created",
  item `USER#<sub>/PROFILE`), SnapStart restore 660 ms + 796 ms. Prod approved

### 4.2c5: Google button in React
- Read Amplify 6.22.2 source first: `enableOAuthListener` completes the flow on the `configure` Hub event (inflight flag
  + `?code=` → token fetch with PKCE → `history.replaceState` strips the code → Hub `signInWithRedirect` + `signedIn`);
  `getCurrentUser`/`fetchAuthSession` wait while the exchange is in flight; `getRedirectUrl` picks the redirect URL
  matching the current origin; `signOut` redirects to Cognito `/logout` only for OAuth sign-ins
- env-from-stack.sh writes VITE_OAUTH_DOMAIN; config.ts `oauthDomain` in KEYS (fail early if missing); auth.ts
  `loginWith.oauth` with redirect URLs from `window.location.origin` (same dist/ for every stage); SocialButtons calls
  `signInWithRedirect({ provider: 'Google' })`; AuthCallbackPage maps loading / signedIn / signedOut(+`?error`)
- Tested locally: Google → /app (claims `cognito:username google_…`, `identities`), profile loads + saves, sign out via
  amazoncognito.com/logout → /login, same sub again, password sign-in unchanged. Cancel at Google not reachable (Google
  skips screens after consent) → tested the error UI with `/auth/callback?error=access_denied&error_description=…`
- **Mistakes:** replacing `SocialButtons` also deleted `GoogleIcon` → `Cannot find name 'GoogleIcon'` (tsc); password
  sign-in "Incorrect username or password": typed the old 7-character password (policy is 8+) after the forgot-password
  test had changed it

### 4.2c6: Account linking (deferred)
- Same email via password and via Google = two Cognito users, two subs, two profiles. Fix needs a PreSignUp trigger +
  `AdminLinkProviderForUser`. Chose to defer it to the backlog ("before real users") and move on to tiers

### 4.3a: Tier model
- `Tier` enum FREE, PRO (BUSINESS dropped for now: one line to add later, at the end, since declaration order = rank).
  `fromStored`: null/unknown → FREE (fail closed, old profiles need no migration); `includes` = `compareTo >= 0`
- `User` record gets `tier`; adding a record component makes the compiler list every `new User(...)` (the to-do list).
  PostConfirmation writes `tier: FREE` (insert Map.of now has 10 pairs = Map.of's maximum)
- **Mistakes:** ran `mvn` from `services/` (no pom.xml there); missed the two `new User` calls in ApiHandlerTest

### 4.3b: GET /v1/users/me + tier check
- `ApiException.forbidden`, `TierCheck.require(user, tier)` → 403 Problem Details `Tier.Required`; endpoints `GetMe`
  (profile + tier) and `GetProDemo` (`GET /v1/demo/pro`); tier read from DynamoDB per request, not from the token.
  Tests: FREE gets 403, PRO gets 200, /me shows FREE → 19 tests
- **Mistakes:** pasted the new endpoint list as a class field → `cannot find symbol: users` (constructor parameter only
  exists inside the constructor); `grep surefire-reports` after a failed build showed stale counts → chain with `&&`

### 4.3c: CDK routes
- `v1` kept in a variable (same construct ID → no change), `users/me` and `v1/demo/pro` GET with the Cognito authorizer,
  no model (no body). Diff: 3 Resources, GET/OPTIONS Methods, 4 Lambda Permissions, new Deployment; both functions get
  the new JAR (PostConfirmation really changed: writes tier). Nothing stateful touched
- `cdk diff` needs the construct path (`UserManagement-Pipeline/beta/UserManagement`), not the stack name; `cdk ls` shows both
- Deployed beta + prod (routes answer 401 without a token = route exists + authorizer guards it). Beta test with a CLI
  token (`read -s` for the password): pre-4.3 user /me → FREE, /demo/pro 403 `Tier.Required`, `update-item` tier=PRO
  (`attribute_exists(pk)` guards typos), same token → 200. Tier in DynamoDB = instant upgrade/downgrade
- **Mistakes:** ran the git commands from `infra/` (pathspec errors, chain still switched to main; nothing lost, nothing
  pushed); replaced the whole `read -s "PW?Password: "` string with a prompt → zsh "not an identifier"

### 4.3d: tutorialVersion
- `int tutorialVersion` on User (missing → 0, not written at insert); GET /me returns it; PUT /v1/users/me/tutorial
  → `UpdateTutorialProgress`, Validation `atLeast` (Integer, so a missing field is an error, not 0)
- Repository `raiseTutorialVersion`: one conditional UpdateItem (compare inside DynamoDB = no race between tabs);
  `ReturnValuesOnConditionCheckFailure.ALL_OLD` tells "user missing" (404) from "already higher" (no-op 204)
- CDK: `me` kept in a variable (same ID → no change), `tutorial` PUT with validator + `UpdateTutorialRequest` model
  (integer, minimum 1). Diff: additions only. 22 tests
- Deployed beta + prod. Curl test on beta: /me → 0, PUT 2 → 204, PUT 1 → 204 (no-op), /me → 2; PUT 0, 2.5 and `{}`
  → 400 `Request.ValidationFailed` from the gateway (detail only "Invalid request body": the edge is cheap but vague,
  Java gives field errors)

### 4.4a: /me in the frontend
- `Me` type + `getMe` in api.ts; `isTierError` + `isAuthError` excludes it (the review's 403 bug, fixed before any
  gated page existed). MeProvider as a layout route inside RequireAuth (unmounts on sign-out → no stale tier);
  `useMe()`; tier badge in the sidebar. Tested: umtest2 PRO, Google user FREE, no PRO flash when switching users
- ESLint `react-hooks/set-state-in-effect`: `useEffect(() => void reload())` flagged → first load via promise
  callbacks + `active` guard; `reload` stays for event handlers (pipeline runs build, not lint: run `npx eslint src`)

### 4.4b: Locked PRO page
- `hasTier` (mirrors Java `includes`, unknown → no access), UpgradePrompt component, ProPage (/app/pro) calls
  `GET /v1/demo/pro` only when allowed; three error branches: tier → prompt + reload, auth → sign out, else message
- Test 3: downgraded umtest2 with `update-item` while signed in, clicked the page → 403 → prompt, badge FREE, still
  signed in. **Mistake:** skipped Step 2 (`hasTier` in meContext) → TS2305 "has no exported member"

### 4.4c: Tutorial
- src/tutorial/steps.ts (content + CURRENT_TUTORIAL_VERSION = 1), `<Tutorial>` overlay (role=dialog), Done and Skip
  save via PUT → reload, Replay doesn't save. umtest2 never sees it (stored 2 ≥ 1: upward-only by design)

### Review: best practices (Nov 24)
- External review of main: error consistency, validation limits, template naming, observability, infra tests,
  DynamoDB access patterns. Turned into the Phase 5 plan in CLAUDE.md

---

## Gotchas collected

1. zsh: pasted `#` comments, `$VAR` not word-split, `=word` expansion, `$RANDOM` repeats in subshells
2. `.zshrc` without a trailing newline + `>>` → merged lines
3. Unsaved editor changes (● on the tab) → "nothing changed" surprises
4. cdk init's `.gitignore` ignores `*.js` → handwritten JS needs an exception
5. Chained shell commands keep running after one fails → read the whole output
6. Duplicate construct IDs (e.g. two `addMethod('GET')`) fail at synth
7. Testing during a deploy → transient 500s
8. SnapStart priming must be registered (`Core.getGlobalContext().register(this)`) and read-only
9. Cognito authorizer: missing token → 401, invalid token → 403
10. Removing a REST API route can leave it live in the stage → verify with `get-export`, `create-deployment`
11. API Gateway models only validate the matching Content-Type
12. Admin-created Cognito users don't fire PostConfirmation
13. CORS must be added in every place that produces a response (preflight, Lambda, gateway errors)
14. A nested `environment` in a spread replaces the shared one; spread it again inside
15. `import.meta` doesn't work in the DevTools console
16. npm commands must run in the folder that has the `package.json` (`apps/web`, `infra`)
17. `npm audit fix --force` can downgrade packages; check whether the issue ships to users first
18. Vite `VITE_*` values are baked in at build time → use runtime `config.json` for hosted builds
19. With OAC, missing S3 objects return 403 (not 404); the SPA fallback must cover both
20. Never cache `index.html` long; only hashed assets
21. Moving a stack into a Stage/pipeline changes path-derived names (permissions, API deployment, CloudFront origin Id,
    cr-owned tags). Harmless; only replacement of stateful resources is a red flag
22. Without an explicit `stackName`, a stack inside a Stage gets a new CloudFormation name → a second copy of everything
23. Push before deploying a pipeline: its first run pulls `main` from GitHub
24. A pipeline change shows one "Cancelled" execution (self-mutation restarts the run)
25. `envFromCfnOutputs` needs the `CfnOutput` object → keep it in a public field on the stack
26. A CORS preflight can return 204 and still be rejected; check `Access-Control-Allow-Origin`
27. `get-pipeline-state` is a subcommand: `aws codepipeline get-pipeline-state --name …`
28. Blank page in dev = runtime error before render; check the browser Console, then `npx tsc -b` (Vite doesn't type-check)
29. Relative paths in git/mv/cat depend on the current folder: `git add CLAUDE.md` from `services/user-api` stages nothing
30. Renaming a file doesn't rename its export; imports ask for the export name
31. OAuth origin (scheme + host, no path) ≠ redirect URI (exact full string)
32. CloudFormation `ssm-secure` references only work for a few properties; `ssm` (plain String) works everywhere
33. CDK sets OAuth defaults on every app client (example.com callback, implicit flow); set `oAuth` explicitly
34. A resource referenced only by name (client → "Google") needs `node.addDependency`
35. Moving CDK code doesn't change a resource; its construct ID does
36. Cognito's generic error page hides the reason in the URL (`?error=`); check the pipeline really reached the stage
37. When replacing "the function", keep its helpers (GoogleIcon) — tsc catches it, `npm run dev` shows a blank page
38. CSP only exists on CloudFront: localhost can't prove the `connect-src` entry, the hosted beta test can
39. Test reports in `target/surefire-reports` survive a failed build: read counts only after BUILD SUCCESS (`mvn package && grep …`)
40. A 403 now has two meanings: authorizer (bad token → sign in again) vs Java `Tier.Required` (upgrade prompt); check the title
41. `cdk diff <path>`: stage stacks are addressed by construct path, not CloudFormation stack name (`npx cdk ls`)
42. zsh `read -s "VAR?Prompt: "`: the part before `?` is the variable name; never type the secret into the command
43. To add a child under an existing CDK resource, keep it in a variable; calling `addResource('me')` twice = duplicate ID
44. A failed DynamoDB condition can return the current item (`ReturnValuesOnConditionCheckFailure.ALL_OLD`) to explain why
45. Frontend tier checks are UX only (DevTools can change them); the server check is the lock
46. User-specific context belongs below the auth guard (unmounts on sign-out), not in a global provider
47. The pipeline doesn't lint: `npx tsc -b && npx eslint src` before pushing frontend changes

---

## Commands cheat sheet

```bash
# Deploy = git push (pipeline). Local build + diff before pushing infra changes:
(cd apps/web && npm run build) && (cd services/user-api && mvn package) && cd infra
npx cdk list
npx cdk diff 'UserManagement-Pipeline/beta/UserManagement'
npx cdk deploy UserManagement-Pipeline        # only the pipeline stack itself, only after git push

# Pipeline status / history
aws codepipeline get-pipeline-state --name UserManagement-Pipeline \
  --query 'stageStates[].{Stage:stageName,Status:latestExecution.status}' --output table
aws codepipeline list-pipeline-executions --pipeline-name UserManagement-Pipeline --max-items 3 \
  --query 'pipelineExecutionSummaries[].{Status:status,Commit:sourceRevisions[0].revisionId,Trigger:trigger.triggerType}' --output table

# Stack outputs (beta or prod)
aws cloudformation describe-stacks --stack-name UserManagement-prod \
  --query "Stacks[0].Outputs[].[OutputKey,OutputValue]" --output text

# Verify a commit
git show --stat HEAD
git check-ignore -v <file>

# Logs
aws logs tail /aws/lambda/usermanagement-beta-api --since 10m --format short
aws logs tail /aws/lambda/usermanagement-beta-post-confirmation --since 10m --format short

# DynamoDB
aws dynamodb get-item --table-name usermanagement-beta \
  --key '{"pk":{"S":"USER#<sub>"},"sk":{"S":"PROFILE"}}'

# Invoke Lambda directly with a test event
aws lambda invoke --function-name usermanagement-beta-api \
  --cli-binary-format raw-in-base64-out --payload file:///tmp/event.json /tmp/out.json

# Cognito
aws cognito-idp sign-up --client-id $CLIENT_ID --username "$EMAIL" --password '...' \
  --user-attributes Name=email,Value="$EMAIL" Name=given_name,Value=... Name=family_name,Value=...
aws cognito-idp confirm-sign-up --client-id $CLIENT_ID --username "$EMAIL" --confirmation-code <code>
aws cognito-idp initiate-auth --client-id $CLIENT_ID --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters USERNAME="$EMAIL",PASSWORD='...' --query AuthenticationResult.IdToken --output text

# Decode a JWT payload
jq -R 'split(".")[1] | gsub("-";"+") | gsub("_";"/") | . + ("=" * ((4 - length % 4) % 4)) | @base64d | fromjson' <<< "$ID_TOKEN"

# API Gateway: what is actually deployed in the stage
aws apigateway get-export --rest-api-id <id> --stage-name beta --export-type oas30 out.json && jq '.paths | keys' out.json
aws apigateway create-deployment --rest-api-id <id> --stage-name beta
```

---

## Next

Push 4.4a–c, test on hosted beta, approve prod (Phase 4 done). Then Phase 5, starting with 5.1 Cleanup. See
CLAUDE.md "Current step" and "Phase 5 plan".
