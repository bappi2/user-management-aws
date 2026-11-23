import { Stage, StageConfig } from './types';

const ACCOUNT = process.env.USER_MGMT_ACCOUNT;
if (!ACCOUNT || !/^\d{12}$/.test(ACCOUNT)) {
  throw new Error(`USER_MGMT_ACCOUNT must be a 12-digit AWS account id, got: "${ACCOUNT}"`);
}
const REGION = 'us-west-2';

export const STAGES: Record<Stage, StageConfig> = {
  beta: {
    stage: 'beta',
    env: { account: ACCOUNT, region: REGION },
    retainData: false,
    pointInTimeRecovery: false,
    lambda: { memorySize: 1024, timeoutSeconds: 10 },
    api: { throttleRateLimit: 10, throttleBurstLimit: 20 },
    // beta:
    web: { allowedOrigins: ['http://localhost:5173'] },
    auth: {
      domainPrefix: 'usermanagement-beta',     // prod: 'usermanagement-prod'
      googleClientId: '431777174815-03qcn92i28dtl0m2g9lp194gtkkfdq67.apps.googleusercontent.com',
      googleClientSecretParameter: '/usermanagement/google-client-secret',
    },

  },
  prod: {
    stage: 'prod',
    env: { account: ACCOUNT, region: REGION },
    retainData: false,          // flip to true once real users exist
    pointInTimeRecovery: false,
    lambda: { memorySize: 1024, timeoutSeconds: 10 },
    api: { throttleRateLimit: 10, throttleBurstLimit: 20 },
    // prod:
    web: { allowedOrigins: [] },   // CloudFront URL added in 2.5
    auth: {
      domainPrefix: 'usermanagement-prod',
      googleClientId: '431777174815-03qcn92i28dtl0m2g9lp194gtkkfdq67.apps.googleusercontent.com',
      googleClientSecretParameter: '/usermanagement/google-client-secret',
    },
  },

};
