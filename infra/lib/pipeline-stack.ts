import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as pipelines from 'aws-cdk-lib/pipelines';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import { PIPELINE } from '../config/pipeline';
import { STAGES } from '../config/environments';
import { UserManagementStage } from './user-management-stage';

export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    // Source: GitHub through the CodeConnections app (no token stored in AWS)
    const source = pipelines.CodePipelineSource.connection(PIPELINE.repo, PIPELINE.branch, {
      connectionArn: PIPELINE.connectionArn,
    });

    const pipeline = new pipelines.CodePipeline(this, 'Pipeline', {
      pipelineName: 'UserManagement-Pipeline',
      pipelineType: codepipeline.PipelineType.V2,  // pay per action-minute, nothing while idle
      crossAccountKeys: false,                     // one account: no KMS key needed

      // Synth: the same build order you run by hand, then cdk synth
      synth: new pipelines.ShellStep('Synth', {
        input: source,
        env: { USER_MGMT_ACCOUNT: this.account },
        commands: [
          '(cd apps/web && npm ci && npm run build)',
          '(cd services/user-api && mvn -B package)',
          '(cd infra && npm ci && npx cdk synth)',
        ],
        primaryOutputDirectory: 'infra/cdk.out',
      }),

      // CodeBuild image + language versions for the synth step
      synthCodeBuildDefaults: {
        buildEnvironment: { buildImage: codebuild.LinuxBuildImage.STANDARD_7_0 },
        partialBuildSpec: codebuild.BuildSpec.fromObject({
          phases: { install: { 'runtime-versions': { nodejs: 22, java: 'corretto21' } } },
        }),
      },
    });

    pipeline.addStage(new UserManagementStage(this, 'beta', { config: STAGES.beta }));
  }
}
