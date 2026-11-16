#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { UserManagementStage } from '../lib/user-management-stage';
import { STAGES } from '../config/environments';

const app = new cdk.App();

for (const config of Object.values(STAGES)) {
  new UserManagementStage(app, config.stage, { config });
}
