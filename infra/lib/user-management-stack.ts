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
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/placeholder')),
      memorySize: config.lambda.memorySize,
      timeout: Duration.seconds(config.lambda.timeoutSeconds),
      environment: { TABLE_NAME: this.table.tableName },
      logGroup,
    });

    this.table.grantReadWriteData(apiFunction);

        const api = new apigw.RestApi(this, 'Api', {
      restApiName: `usermanagement-${config.stage}`,
      deployOptions: {
        stageName: config.stage,
        throttlingRateLimit: config.api.throttleRateLimit,
        throttlingBurstLimit: config.api.throttleBurstLimit,
      },
    });

    const integration = new apigw.LambdaIntegration(apiFunction);

    const users = api.root.addResource('v1').addResource('users');

    // Evently: RegisterUser (.AllowAnonymous)
    users.addResource('register').addMethod('POST', integration);

    // Evently: GetUserProfile / UpdateUserProfile (.RequireAuthorization -> Cognito later)
    const profile = users.addResource('profile');
    profile.addMethod('GET', integration);
    profile.addMethod('PUT', integration);

    new CfnOutput(this, 'ApiUrl', { value: api.url });

  }
}
