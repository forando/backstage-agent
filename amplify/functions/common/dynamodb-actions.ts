import https from 'https'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { NodeHttpHandler } from '@aws-sdk/node-http-handler'
import {
  DynamoDBDocumentClient,
  GetCommand,
  GetCommandInput,
  UpdateCommandInput,
  UpdateCommand
} from '@aws-sdk/lib-dynamodb'
import { GetEntityOutput } from './dynamodb-entity'

const ddbClient = new DynamoDBClient({
  region: process.env.TABLE_REGION,
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 1000,
    requestTimeout: 1000,
    httpsAgent: new https.Agent({ keepAlive: true }),
  }),
});

const ddbDocClient = DynamoDBDocumentClient.from(ddbClient)

export const getEntity = async <T>(
  tableName: string,
  id: string,
): Promise<GetEntityOutput<T>> => {
  const params: GetCommandInput = {
    TableName: tableName,
    Key: { id }
  }

  // @ts-expect-error - Item is not part of the GetItemCommandOutput type
  return await ddbDocClient.send(new GetCommand(params));
}

export const writeUpdate = async (command: UpdateCommandInput) => {
  return await ddbDocClient.send(new UpdateCommand(command));
}
