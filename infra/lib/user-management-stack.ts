import { Stack, StackProps, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { StageConfig } from '../config/types';

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
  }
}
