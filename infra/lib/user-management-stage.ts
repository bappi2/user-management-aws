import { Stage, StageProps, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StageConfig } from '../config/types';
import { UserManagementStack } from './user-management-stack';

export interface UserManagementStageProps extends StageProps {
  readonly config: StageConfig;
}

/** One environment (beta or prod). The pipeline deploys Stages, not stacks. */
export class UserManagementStage extends Stage {
  public readonly stack: UserManagementStack;

  constructor(scope: Construct, id: string, props: UserManagementStageProps) {
    super(scope, id, props);
    const { config } = props;

    this.stack = new UserManagementStack(this, 'UserManagement', {
      stackName: `UserManagement-${config.stage}`,   // keep the existing CloudFormation stack name
      env: config.env,
      config,
    });

    Tags.of(this).add('Project', 'user-management');
    Tags.of(this).add('Developer', 'mmeftauddin');
    Tags.of(this).add('ManagedBy', 'cdk');
    Tags.of(this).add('Stage', config.stage);
  }
}
