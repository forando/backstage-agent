import { Construct } from 'constructs'
import * as cdk from 'aws-cdk-lib'
import { Policy } from 'aws-cdk-lib/aws-iam'
import { EventSourceMapping, IFunction, StartingPosition } from 'aws-cdk-lib/aws-lambda'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'

export interface DbProps {
  tableName: string
  readWriteLambdas: IFunction[],
  stream: {
    cdcLambda: IFunction;
    policy: Policy;
  };
}

export class DataBase extends Construct {
  public readonly table: dynamodb.Table

  constructor(scope: Construct, id: string, props: DbProps) {
    super(scope, id)

    const tableProps = {
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      maxReadRequestUnits: 5,
      maxWriteRequestUnits: 5,
      tableName: props.tableName
    };

    this.table = new dynamodb.Table(this, props.tableName, tableProps)

    for (const lambda of props.readWriteLambdas) {
      this.table.grantReadWriteData(lambda)
    }

    this.table.grantReadWriteData(props.stream.cdcLambda)

    props.stream.cdcLambda.role?.attachInlinePolicy(props.stream.policy)
    const mapping = new EventSourceMapping(
        this,
        `${props.tableName}-event-stream-mapping`,
        {
          target: props.stream.cdcLambda,
          eventSourceArn: this.table.tableStreamArn,
          startingPosition: StartingPosition.LATEST,
        },
    )
    mapping.node.addDependency(props.stream.policy)
  }
}
