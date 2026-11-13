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

---

## Commands cheat sheet

```bash
# Build + deploy
cd services/user-api && mvn package && cd ../../infra
npx cdk diff UserManagement-beta
npx cdk deploy UserManagement-beta
npx cdk destroy UserManagement-beta

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

Phase 2: React + Vite frontend in `apps/web` (CORS, Cognito sign-up/confirm/sign-in with SRP, profile page,
per-stage config, then S3 + CloudFront hosting). See CLAUDE.md "Current step".
