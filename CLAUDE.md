# user-management-aws

I'm learning React, AWS CDK, Java Lambda and DynamoDB. Explain what you do, go step by step.
Claude does not modify code: Claude explains, I make the changes myself.

## Stack
- infra/: AWS CDK (TypeScript). Stacks UserManagement-beta and UserManagement-prod
- services/user-api/: Java Lambda (Maven, compile with release 21; local JDK is 27)
- apps/web/: React + Vite (later)
- platform/: CDK pipeline (later); docs/: architecture notes

## Decisions
- Build order: infra → backend → frontend
- One AWS account for now (456423665721, us-west-2); separate beta/prod accounts later via AWS Organizations
- AWS account comes from env var USER_MGMT_ACCOUNT (set in ~/.zshrc; validated as 12 digits in environments.ts). Pipeline will need it too.
- Config pattern: infra/config/types.ts + environments.ts (stage, env, retainData, pointInTimeRecovery, lambda, api)
- DynamoDB single-table design: table `usermanagement-${stage}`, keys pk/sk, GSI1 (gsi1pk/gsi1sk), PAY_PER_REQUEST
- No VPC (DynamoDB is reached over IAM + HTTPS)
- Everything destroyable while learning (RemovalPolicy.DESTROY, retainData false)
- Tags: Project, Developer, ManagedBy, Stage
- API design follows my Evently project (bappi2/evently7, Users module):
  - POST /v1/users/register (anonymous)
  - GET/PUT /v1/users/profile (userId from JWT claims; Cognito authorizer later)
  - One Lambda, router → one handler per use case; errors as RFC 7807 Problem Details
- REST API (apigateway.RestApi), proxy integration, stage name = config.stage, throttling from config
- Request validation: API Gateway models for shape (rejects at the edge, no Lambda cost) + Java validation
  for rules (authoritative, per-field errors). Gateway 400s use Problem Details (BAD_REQUEST_BODY gateway response)
- Java Lambda: plain Java (no framework), mirrors Evently file names (RegisterUser, GetUserProfile, UpdateUserProfile,
  Endpoint ≈ IEndpoint, UserRepository ≈ IUserRepository); errors via ApiException → Problem Details
- DynamoDB items: `USER#<id>/PROFILE` + `EMAIL#<email>/EMAIL` (email uniqueness via TransactWriteItems with
  attribute_not_exists); update via conditional UpdateItem (attribute_exists); consistent reads for profile
- Password validated but never stored (Cognito will own credentials); userId = UUID now, Cognito `sub` later
- Lambda runtime: Java 21 on arm64, 1024 MB, low-level DynamoDB client + url-connection-client, SDK timeouts 3s/1s,
  JSON log format with levels, JAVA_TOOL_OPTIONS tiered compilation (level 1)
- SnapStart on published versions; API Gateway calls alias `live`; priming via CRaC beforeCheckpoint must be
  READ-ONLY (runs once per snapshot, possibly several times)
- Build before deploy: `mvn package` in services/user-api, then `cdk deploy` (pipeline will automate)
- Hardening backlog: narrow IAM (grantReadWriteData → exact actions); prime register path; Powertools (logging,
  metrics, tracing, idempotency); DynamoDB Local/Testcontainers tests; CodeDeploy canary on alias;
  custom domain + HTTPS with frontend phase

## Done
- 1.2: CDK app, stage config, DynamoDB table (deployed, tested, destroyed)
- 1.3: Placeholder Node Lambda (infra/lambda/placeholder) + REST API routes (deployed, tested, destroyed)
- 1.3b: Request validator + models for register / profile PUT, Problem Details gateway response (deployed, tested, destroyed)
- 1.4: Java Lambda in services/user-api (router, 3 endpoints, DynamoDbUserRepository, 8 JUnit tests); placeholder removed;
  arm64 + SnapStart + priming. Cold start: client 4.4s → 3.0s, billed 3.45s → 1.8s (deployed, tested, destroyed)

## Current step
Phase 1.5: Cognito User Pool + API Gateway Cognito authorizer on /v1/users/profile; RegisterUser creates the Cognito
user and userId becomes the Cognito `sub`.
