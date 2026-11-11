import { Environment } from 'aws-cdk-lib';

export type Stage = 'beta' | 'prod';

export interface StageConfig {
  readonly stage: Stage;
  readonly env: Required<Pick<Environment, 'account' | 'region'>>;
  readonly retainData: boolean;          // keep the table if the stack is deleted?
  readonly pointInTimeRecovery: boolean; // continuous backups (costs money)
}
