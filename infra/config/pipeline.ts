import { STAGES } from './environments';

const { account, region } = STAGES.beta.env;

export const PIPELINE = {
  repo: 'bappi2/user-management-aws',   // GitHub owner/repo
  branch: 'main',                       // every push to main runs the pipeline
  env: { account, region },             // the pipeline lives in the same account (one account for now)
  connectionArn: `arn:aws:codeconnections:${region}:${account}:connection/0276884a-5c87-415b-8280-b67e4535e019`,
};
