# Backstage AI Agent

This agent provides an interactive communication channel to query an analyze documentation stored in [Backstage](https://backstage.io).

## Installation

### Pre-requisites
- Thechdocs is deployed following [Recommended Deployment](https://backstage.io/docs/features/techdocs/architecture#recommended-deployment) guide and __AWS S3__ used as a storage. If the bucket is located in another account, then `s3:ListBucket` and `s3:GetObject` permissions should be granted for the target account.
- [Bedrock models](https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html) are enabled and allowed in the target AWS Account. Namely `amazon.titan-embed-text-v1` and `anthropic.claude-3-5-sonnet-20240620-v1:0` are used.