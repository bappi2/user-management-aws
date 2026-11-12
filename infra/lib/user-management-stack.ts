import { Stack, StackProps, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { StageConfig } from '../config/types';
import * as path from 'path';
import { Duration } from 'aws-cdk-lib';          // or add Duration to your existing aws-cdk-lib import
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as apigw from 'aws-cdk-lib/aws-apigateway';


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

        const functionName = `usermanagement-${config.stage}-api`;

    const logGroup = new logs.LogGroup(this, 'ApiFunctionLogs', {
      logGroupName: `/aws/lambda/${functionName}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const apiFunction = new lambda.Function(this, 'ApiFunction', {
      functionName,
      runtime: lambda.Runtime.JAVA_21,
      architecture: lambda.Architecture.ARM_64,
      handler: 'com.usermanagement.api.ApiHandler::handleRequest',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../services/user-api/target/user-api.jar')),
      memorySize: config.lambda.memorySize,
      timeout: Duration.seconds(config.lambda.timeoutSeconds),
      environment: {
        TABLE_NAME: this.table.tableName,
        JAVA_TOOL_OPTIONS: '-XX:+TieredCompilation -XX:TieredStopAtLevel=1',
      },
      loggingFormat: lambda.LoggingFormat.JSON,
      logGroup,
      snapStart: lambda.SnapStartConf.ON_PUBLISHED_VERSIONS,

    });


    this.table.grantReadWriteData(apiFunction);
    // SnapStart only applies to published versions → API Gateway must call an alias, not $LATEST
    const liveAlias = new lambda.Alias(this, 'ApiFunctionLive', {
      aliasName: 'live',
      version: apiFunction.currentVersion,
    });


    const api = new apigw.RestApi(this, 'Api', {
      restApiName: `usermanagement-${config.stage}`,
      deployOptions: {
        stageName: config.stage,
        throttlingRateLimit: config.api.throttleRateLimit,
        throttlingBurstLimit: config.api.throttleBurstLimit,
      },
    });
        // Validate request bodies (FluentValidation-equivalent at the edge)
    const bodyValidator = api.addRequestValidator('BodyValidator', {
      requestValidatorName: 'body-validator',
      validateRequestBody: true,
      validateRequestParameters: false,
    });

    // Evently: RegisterUserCommandValidator
    const registerUserModel = api.addModel('RegisterUserModel', {
      modelName: 'RegisterUserRequest',
      contentType: 'application/json',
      schema: {
        schema: apigw.JsonSchemaVersion.DRAFT4,
        type: apigw.JsonSchemaType.OBJECT,
        required: ['email', 'password', 'firstName', 'lastName'],
        additionalProperties: false,
        properties: {
          email: { type: apigw.JsonSchemaType.STRING, pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$' },
          password: { type: apigw.JsonSchemaType.STRING, minLength: 6 },
          firstName: { type: apigw.JsonSchemaType.STRING, minLength: 1 },
          lastName: { type: apigw.JsonSchemaType.STRING, minLength: 1 },
        },
      },
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


    //const integration = new apigw.LambdaIntegration(apiFunction);
    const integration = new apigw.LambdaIntegration(liveAlias);


    const users = api.root.addResource('v1').addResource('users');

    // Evently: RegisterUser (.AllowAnonymous)
        users.addResource('register').addMethod('POST', integration, {
      requestValidator: bodyValidator,
      requestModels: { 'application/json': registerUserModel },
    });
   // Evently: GetUserProfile / UpdateUserProfile (.RequireAuthorization -> Cognito later)
    const profile = users.addResource('profile');
    profile.addMethod('GET', integration);                       // no body → no validator
    profile.addMethod('PUT', integration, {
      requestValidator: bodyValidator,
      requestModels: { 'application/json': updateUserProfileModel },
    });


 

    new CfnOutput(this, 'ApiUrl', { value: api.url });

  }
}
