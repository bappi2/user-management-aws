#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { PipelineStack } from '../lib/pipeline-stack';
import { PIPELINE } from '../config/pipeline';

const app = new cdk.App();

const pipeline = new PipelineStack(app, 'UserManagement-Pipeline', { env: PIPELINE.env });
cdk.Tags.of(pipeline).add('Project', 'user-management');
cdk.Tags.of(pipeline).add('Developer', 'mmeftauddin');
cdk.Tags.of(pipeline).add('ManagedBy', 'cdk');
