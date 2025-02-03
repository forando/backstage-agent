import { defineFunction } from '@aws-amplify/backend'
import {CfnFunction, IFunction} from 'aws-cdk-lib/aws-lambda'
import { nameFor } from '../../utils'
import {Policy, PolicyStatement} from 'aws-cdk-lib/aws-iam'
import {Construct} from 'constructs'
import {IBucket} from 'aws-cdk-lib/aws-s3'
import {createKnowledgeBaseS3EventsRule} from '../../events/resource'
import * as targets from 'aws-cdk-lib/aws-events-targets'

const FUNCTION_NAME = 'knowledgeBaseIngestionJob'

export const knowledgeBaseIngestionJob = defineFunction({
  name: FUNCTION_NAME,
  entry: './src/handler.ts',
  runtime: 20,
  timeoutSeconds: 30,
})

export const configureKnowledgeBaseIngestionJobFn = (
    scope: Construct,
    cfn: CfnFunction,
    fn: IFunction,
    knowledgeBaseArn: string,
    bucket: IBucket
) => {
  cfn.functionName = nameFor(FUNCTION_NAME)

  const ingestionPermission = new PolicyStatement({
    sid: "AllowStartIngestionJob",
    actions: ['bedrock:StartIngestionJob'],
    resources: [knowledgeBaseArn, bucket.bucketArn]
  })

  const ingestionPolicy: Policy = new Policy(scope, 'KnowledgeBaseIngestionPolicy', {
    statements: [ingestionPermission],
  })

  fn.role?.attachInlinePolicy(ingestionPolicy)

  const s3KnowledgeBaseEventRule = createKnowledgeBaseS3EventsRule(scope, bucket.bucketName)
  s3KnowledgeBaseEventRule.addTarget(new targets.LambdaFunction(fn))
}

export const configureEnvsForKnowledgeBaseIngestionJobFn = (
    lambda: CfnFunction,
    knowledgeBaseId: string,
    datasourceId: string
) => {
  lambda.addPropertyOverride('Environment.Variables.KNOWLEDGE_BASE_ID', knowledgeBaseId)
  lambda.addPropertyOverride('Environment.Variables.DATA_SOURCE_ID', datasourceId)
}

