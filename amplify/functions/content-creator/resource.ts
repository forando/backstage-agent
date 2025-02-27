import { defineFunction } from '@aws-amplify/backend'
import { CfnFunction } from 'aws-cdk-lib/aws-lambda'
import { nameFor } from '../../utils'
import { IRole, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam'
import {Construct} from 'constructs'
import {IBucket} from 'aws-cdk-lib/aws-s3'

const FUNCTION_NAME = 'contentCreator'

if(!process.env.BACKSTAGE_URL) {
  throw new Error('BACKSTAGE_URL env not defined')
}

export const contentCreator = defineFunction({
  name: FUNCTION_NAME,
  entry: './src/handler.ts',
  runtime: 20,
  timeoutSeconds: 360,
  environment: {
    BACKSTAGE_URL: process.env.BACKSTAGE_URL
  }
})

const sourceBucketName  = process.env.SOURCE_BUCKET_NAME

export const configureContentCreatorFn = (scope: Construct, bucket: IBucket, cfn: CfnFunction, role?: IRole) => {
  if(!sourceBucketName) {
    throw new Error('SOURCE_BUCKET_NAME env not defined')
  }
  cfn.functionName = nameFor(FUNCTION_NAME)

  const writeAccess = new PolicyStatement({
    sid: "AllowWriteAccess",
    actions: ['s3:PutObject'],
    resources: [bucket.arnForObjects('*')]
  })

  const readAccess = new PolicyStatement({
    actions: ['s3:ListBucket', 's3:GetObject'],
    resources: [
      `arn:aws:s3:::${sourceBucketName}`,
      `arn:aws:s3:::${sourceBucketName}/*`
    ],
  },)

  const policy: Policy = new Policy(scope, 'S3Policy', {
    statements: [writeAccess, readAccess],
  })
  role?.attachInlinePolicy(policy)
}

export const configureEnvsForContentCreatorFn = (
  lambda: CfnFunction,
  bucketName: string,
) => {
  if(!sourceBucketName) {
    throw new Error('SOURCE_BUCKET_NAME env not defined')
  }
  lambda.addPropertyOverride('Environment.Variables.DESTINATION_BUCKET_NAME', bucketName)
  lambda.addPropertyOverride('Environment.Variables.SOURCE_BUCKET_NAME', sourceBucketName)
}

