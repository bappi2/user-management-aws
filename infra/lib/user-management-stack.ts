import { Stack, StackProps, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { StageConfig } from '../config/types';
import * as path from 'path';
import { Duration } from 'aws-cdk-lib';          // or add Duration to your existing aws-cdk-lib import
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';



export interface UserManagementStackProps extends StackProps {
  readonly config: StageConfig;
}

export class UserManagementStack extends Stack {
  public readonly table: dynamodb.TableV2;

  constructor(scope: Construct, id: string, props: UserManagementStackProps) {
    super(scope, id, props);
    const { config } = props;

    this.table = new dynamodb.TableV2(this, 'Table', {
      tableName: `usermanagement-${config.stage}`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billing: dynamodb.Billing.onDemand(),
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: config.pointInTimeRecovery,
      },
      removalPolicy: config.retainData ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      globalSecondaryIndexes: [
        {
          indexName: 'GSI1',
          partitionKey: { name: 'gsi1pk', type: dynamodb.AttributeType.STRING },
          sortKey: { name: 'gsi1sk', type: dynamodb.AttributeType.STRING },
        },
      ],
    });

    new CfnOutput(this, 'TableName', { value: this.table.tableName });

        // Evently: Keycloak realm
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `usermanagement-${config.stage}`,
      signInAliases: { email: true },
      signInCaseSensitive: false,
      selfSignUpEnabled: true,
      userVerification: {
        emailSubject: 'Your verification code',
        emailBody: 'Your verification code is {####}',
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
      // decided in 1.5b
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
        givenName: { required: true, mutable: true },
        familyName: { required: true, mutable: true },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: config.retainData ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    // The React app (later) and the CLI (now) sign in through this client
    const webClient = userPool.addClient('WebClient', {
      userPoolClientName: `usermanagement-${config.stage}-web`,
      generateSecret: false,
      authFlows: { userSrp: true, userPassword: true },
      preventUserExistenceErrors: true,
      idTokenValidity: Duration.hours(1),
      accessTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.days(30),
    });

    new CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new CfnOutput(this, 'UserPoolClientId', { value: webClient.userPoolClientId });


    const functionName = `usermanagement-${config.stage}-api`;

    const logGroup = new logs.LogGroup(this, 'ApiFunctionLogs', {
      logGroupName: `/aws/lambda/${functionName}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Shared by every Java function: same JAR, different handler class
    const javaFunctionProps = {
      runtime: lambda.Runtime.JAVA_21,
      architecture: lambda.Architecture.ARM_64,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../services/user-api/target/user-api.jar')),
      memorySize: config.lambda.memorySize,
      environment: {
        TABLE_NAME: this.table.tableName,
        JAVA_TOOL_OPTIONS: '-XX:+TieredCompilation -XX:TieredStopAtLevel=1',
      },
      loggingFormat: lambda.LoggingFormat.JSON,
      snapStart: lambda.SnapStartConf.ON_PUBLISHED_VERSIONS,
    };

    const apiFunction = new lambda.Function(this, 'ApiFunction', {
      ...javaFunctionProps,
      functionName,
      handler: 'com.usermanagement.api.ApiHandler::handleRequest',
      timeout: Duration.seconds(config.lambda.timeoutSeconds),
      logGroup,
    });



    // Least privilege: exactly what GetUserProfile / UpdateUserProfile (and priming) use
    this.table.grant(apiFunction, 'dynamodb:GetItem', 'dynamodb:UpdateItem');

    // SnapStart only applies to published versions → API Gateway must call an alias, not $LATEST
    const liveAlias = new lambda.Alias(this, 'ApiFunctionLive', {
      aliasName: 'live',
      version: apiFunction.currentVersion,
    });

        // Cognito PostConfirmation trigger (Evently: RegisterUserCommandHandler)
    const postConfirmationName = `usermanagement-${config.stage}-post-confirmation`;

    const postConfirmationLogs = new logs.LogGroup(this, 'PostConfirmationLogs', {
      logGroupName: `/aws/lambda/${postConfirmationName}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const postConfirmationFunction = new lambda.Function(this, 'PostConfirmationFunction', {
      ...javaFunctionProps,
      functionName: postConfirmationName,
      handler: 'com.usermanagement.api.users.PostConfirmationHandler::handleRequest',
      timeout: Duration.seconds(5),   // Cognito waits at most 5 s for a trigger
      logGroup: postConfirmationLogs,
    });

    this.table.grant(postConfirmationFunction, 'dynamodb:PutItem', 'dynamodb:GetItem');

    const postConfirmationAlias = new lambda.Alias(this, 'PostConfirmationLive', {
      aliasName: 'live',
      version: postConfirmationFunction.currentVersion,
    });

    userPool.addTrigger(cognito.UserPoolOperation.POST_CONFIRMATION, postConfirmationAlias);



    const api = new apigw.RestApi(this, 'Api', {
      restApiName: `usermanagement-${config.stage}`,
      deployOptions: {
        stageName: config.stage,
        throttlingRateLimit: config.api.throttleRateLimit,
        throttlingBurstLimit: config.api.throttleBurstLimit,
      },
    });
        
    // Evently: .RequireAuthorization()
    const authorizer = new apigw.CognitoUserPoolsAuthorizer(this, 'UserPoolAuthorizer', {
      cognitoUserPools: [userPool],
      authorizerName: `usermanagement-${config.stage}-cognito`,
    });

    
    // Validate request bodies (FluentValidation-equivalent at the edge)
    const bodyValidator = api.addRequestValidator('BodyValidator', {
      requestValidatorName: 'body-validator',
      validateRequestBody: true,
      validateRequestParameters: false,
    });

    // Evently: UpdateUserProfile.Request
    const updateUserProfileModel = api.addModel('UpdateUserProfileModel', {
      modelName: 'UpdateUserProfileRequest',
      contentType: 'application/json',
      schema: {
        schema: apigw.JsonSchemaVersion.DRAFT4,
        type: apigw.JsonSchemaType.OBJECT,
        required: ['firstName', 'lastName'],
        additionalProperties: false,
        properties: {
          firstName: { type: apigw.JsonSchemaType.STRING, minLength: 1 },
          lastName: { type: apigw.JsonSchemaType.STRING, minLength: 1 },
        },
      },
    });

    // Return validation errors as Problem Details, like the Lambda does
    api.addGatewayResponse('BadRequestBody', {
      type: apigw.ResponseType.BAD_REQUEST_BODY,
      statusCode: '400',
      responseHeaders: { 'Content-Type': "'application/problem+json'" },
      templates: {
        'application/json':
          '{"type":"about:blank","title":"Request.ValidationFailed","status":400,"detail":$context.error.messageString}',
      },
    });
        api.addGatewayResponse('Unauthorized', {
      type: apigw.ResponseType.UNAUTHORIZED,
      statusCode: '401',
      responseHeaders: { 'Content-Type': "'application/problem+json'" },
      templates: {
        'application/json':
          '{"type":"about:blank","title":"Auth.Unauthorized","status":401,"detail":$context.error.messageString}',
      },
    });

    api.addGatewayResponse('AccessDenied', {
      type: apigw.ResponseType.ACCESS_DENIED,
      statusCode: '403',
      responseHeaders: { 'Content-Type': "'application/problem+json'" },
      templates: {
        'application/json':
          '{"type":"about:blank","title":"Auth.Forbidden","status":403,"detail":$context.error.messageString}',
      },
    });



    //const integration = new apigw.LambdaIntegration(apiFunction);
    const integration = new apigw.LambdaIntegration(liveAlias);


    const users = api.root.addResource('v1').addResource('users');

   // Evently: GetUserProfile / UpdateUserProfile (.RequireAuthorization -> Cognito later)
    const profile = users.addResource('profile');
    profile.addMethod('GET', integration, {
      authorizer,
      authorizationType: apigw.AuthorizationType.COGNITO,
    });
    profile.addMethod('PUT', integration, {
      authorizer,
      authorizationType: apigw.AuthorizationType.COGNITO,
      requestValidator: bodyValidator,
      requestModels: { 'application/json': updateUserProfileModel },
    });



 

    new CfnOutput(this, 'ApiUrl', { value: api.url });

  }
}
