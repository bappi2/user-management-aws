import { Stage, StageConfig } from './types';

const ACCOUNT = process.env.USER_MGMT_ACCOUNT;
if (!ACCOUNT) {
  throw new Error('USER_MGMT_ACCOUNT is not set. Add it to ~/.zshrc');
}
const REGION = 'us-west-2';

export const STAGES: Record<Stage, StageConfig> = {
  beta: {
    stage: 'beta',
    env: { account: ACCOUNT, region: REGION },
    retainData: false,
    pointInTimeRecovery: false,
  },
  prod: {
    stage: 'prod',
    env: { account: ACCOUNT, region: REGION },
    retainData: false,          // flip to true once real users exist
    pointInTimeRecovery: false,
  },
};
