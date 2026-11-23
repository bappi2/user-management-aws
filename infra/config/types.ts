import { Environment } from 'aws-cdk-lib';

export type Stage = 'beta' | 'prod';

export interface StageConfig {
  readonly stage: Stage;
  readonly env: Required<Pick<Environment, 'account' | 'region'>>;
  readonly retainData: boolean;          // keep the table if the stack is deleted?
  readonly pointInTimeRecovery: boolean; // continuous backups (costs money)
  readonly lambda: {
    readonly memorySize: number;      // MB
    readonly timeoutSeconds: number;
  };
  readonly api: {
    readonly throttleRateLimit: number;   // steady requests/sec
    readonly throttleBurstLimit: number;  // short spikes
  };
    readonly web: {
    readonly allowedOrigins: string[];   // browser origins allowed to call the API (CORS)
  };
  readonly auth: {
    readonly domainPrefix: string;                 // https://<prefix>.auth.<region>.amazoncognito.com (globally unique per region)
    readonly googleClientId: string;               // public (appears in sign-in URLs)
    readonly googleClientSecretParameter: string;  // SSM parameter name holding the secret (created by hand, 4.2c3)
  };


}
