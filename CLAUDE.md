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
- Placeholder Lambda is plain JS (infra/.gitignore has `!lambda/**/*.js` so it is tracked); removed in 1.4

## Done
- 1.2: CDK app, stage config, DynamoDB table (deployed, tested, destroyed)
- 1.3: Placeholder Node Lambda (infra/lambda/placeholder) + REST API routes (deployed, tested, destroyed)
- 1.3b: Request validator + models for register / profile PUT, Problem Details gateway response (deployed, tested, destroyed)

## Current step
Phase 1.4: Java Lambda in services/user-api (Maven, Java 21, router + RegisterUser/GetUserProfile/UpdateUserProfile
handlers, read/write DynamoDB, SnapStart). Then swap the placeholder in the stack, delete infra/lambda/placeholder
and its `!lambda/**/*.js` .gitignore rule.
