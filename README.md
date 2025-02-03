# Backstage AI Agent

This agent provides an interactive communication channel to query an analyze documentation stored in [Backstage](https://backstage.io).

## Installation

### Pre-requisites
- Thechdocs is deployed following [Recommended Deployment](https://backstage.io/docs/features/techdocs/architecture#recommended-deployment) guide and __AWS S3__ used as a storage. If the bucket is located in another account, then `s3:ListBucket` and `s3:GetObject` permissions should be granted for the target account.
- [Bedrock models](https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html) are enabled and allowed in the target AWS Account. Namely `amazon.titan-embed-text-v1` and `anthropic.claude-3-5-sonnet-20240620-v1:0` are used.

The backend is built with CDK using Amplify.

To deploy a sandboxed version of the agent, execute from the root:

```bash
SOURCE_BUCKET_NAME=<your_s3_bucket_name> npx ampx sandbox
```