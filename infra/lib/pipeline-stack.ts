import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as pipelines from 'aws-cdk-lib/pipelines';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import { PIPELINE } from '../config/pipeline';
import { STAGES } from '../config/environments';
import { UserManagementStage } from './user-management-stage';

/** Post-deploy checks for one stage: site, runtime config, authorizer, CORS. */
function smokeTest(stage: UserManagementStage): pipelines.ShellStep {
  return new pipelines.ShellStep('SmokeTest', {
    envFromCfnOutputs: {
      WEB_URL: stage.stack.webUrl,
      API_URL: stage.stack.apiUrl,
    },
    commands: [
      'echo "Testing $WEB_URL and $API_URL"',
      '[ "$(curl -s -o /dev/null -w "%{http_code}" "$WEB_URL")" = "200" ]',
      '[ "$(curl -s -o /dev/null -w "%{http_code}" "$WEB_URL/config.json")" = "200" ]',
      '[ "$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}v1/users/profile")" = "401" ]',
      '[ "$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS -H "Origin: $WEB_URL" -H "Access-Control-Request-Method: GET" "${API_URL}v1/users/profile")" = "204" ]',
    ],
  });
}


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

    const beta = new UserManagementStage(this, 'beta', { config: STAGES.beta });
    pipeline.addStage(beta, { post: [smokeTest(beta)] });

    const prod = new UserManagementStage(this, 'prod', { config: STAGES.prod });
    pipeline.addStage(prod, {
      pre: [new pipelines.ManualApprovalStep('PromoteToProd', {
        comment: 'Beta deployed and smoke-tested. Deploy this commit to prod?',
      })],
      post: [smokeTest(prod)],
    });


  }
}
