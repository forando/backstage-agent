import { Construct } from 'constructs'
import * as events from 'aws-cdk-lib/aws-events'
import {
    CfnApi,
    CfnChannelNamespace,
    AuthorizationType,
} from 'aws-cdk-lib/aws-appsync'
import {Stack} from 'aws-cdk-lib'
import {IRole, Policy, PolicyStatement} from 'aws-cdk-lib/aws-iam'

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

export const createAppSyncEventApi = (stack: Stack, name: string, userPoolId: string, role: IRole): CfnApi => {
    // add a new Event API to the stack:
    const cfnEventAPI = new CfnApi(stack, 'CfnEventAPI', {
        name,
        eventConfig: {
            authProviders: [
                {
                    authType: AuthorizationType.IAM,
                },
                {
                    authType: AuthorizationType.API_KEY,
                },
                {
                    authType: AuthorizationType.USER_POOL,
                    cognitoConfig: {
                        awsRegion: stack.region,
                        // configure Event API to use the Cognito User Pool provisioned by Amplify:
                        userPoolId,
                    },
                }
            ],
            // configure the User Pool as the auth provider for Connect, Publish, and Subscribe operations:
            connectionAuthModes: [{ authType: AuthorizationType.USER_POOL }, { authType: AuthorizationType.API_KEY }],
            defaultPublishAuthModes: [{ authType: AuthorizationType.API_KEY }],
            defaultSubscribeAuthModes: [{ authType: AuthorizationType.USER_POOL }, { authType: AuthorizationType.API_KEY }],
        },
    })


// create a default namespace for our Event API:
    new CfnChannelNamespace(
        stack,
        'CfnEventAPINamespace',
        {
            apiId: cfnEventAPI.attrApiId,
            name: 'default',
        }
    )

    role.attachInlinePolicy(
        new Policy(stack, 'AppSyncEventPolicy', {
            statements: [
                new PolicyStatement({
                    actions: [
                        'appsync:EventConnect',
                        'appsync:EventSubscribe',
                        'appsync:EventPublish',
                    ],
                    resources: [`${cfnEventAPI.attrApiArn}/*`, `${cfnEventAPI.attrApiArn}`],
                }),
            ],
        })
    )

    return cfnEventAPI
}