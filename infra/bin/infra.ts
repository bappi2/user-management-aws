#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
//import { InfraStack } from '../lib/infra-stack';
import { UserManagementStack } from '../lib/user-management-stack';
import { STAGES } from '../config/environments';

const app = new cdk.App();

for (const config of Object.values(STAGES)) {
  const stack = new UserManagementStack(app, `UserManagement-${config.stage}`, {
    env: config.env,
    config,
  });

  cdk.Tags.of(stack).add('Project', 'user-management');
  cdk.Tags.of(stack).add('Developer', 'mmeftauddin');
  cdk.Tags.of(stack).add('ManagedBy', 'cdk');
  cdk.Tags.of(stack).add('Stage', config.stage);
}

// new InfraStack(app, 'InfraStack', {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
//});
