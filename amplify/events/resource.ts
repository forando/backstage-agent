import { Construct } from 'constructs'
import * as events from 'aws-cdk-lib/aws-events'

export const createKnowledgeBaseS3EventsRule = (scope: Construct, bucketName: string): events.Rule => {
    return new events.Rule(scope, 's3-knowledge-base-rule', {
        eventPattern: {
            source: ['aws.s3'],
            detailType: ["Object Created", "Object Deleted"],
            detail: {
                bucket: {
                    name: [bucketName]
                }
            },
        },
    });
}