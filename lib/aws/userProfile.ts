import { PutItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { ddb } from "./dynamo";
import { DDB_TABLE_MUSE_USERS } from "./config";
import { Buffer } from "buffer";

function decodeJwt(idToken: string): any {
  const payload = idToken.split(".")[1];
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const json = Buffer.from(normalized, "base64").toString("utf8");
  return JSON.parse(json);
}

export async function ensureMuseUserRow(idToken: string) {
  const claims = decodeJwt(idToken);
  const userId = claims?.sub as string;
  const email = (claims?.email as string) || "";
  const name = (claims?.name as string) || "";

  const put = new PutItemCommand({
    TableName: DDB_TABLE_MUSE_USERS,
    Item: {
      userId: { S: userId },
      email: { S: email },
      name: { S: name },
      createdAt: { S: new Date().toISOString() },
      currentStoreId: { NULL: true },
      printfulApiKey: { NULL: true },
    },
    ConditionExpression: "attribute_not_exists(userId)",
  });

  try { await ddb.send(put); }
  catch (e: any) { if (e.name !== "ConditionalCheckFailedException") throw e; }
}

export async function savePrintfulKeyAndStore(idToken: string, apiKey: string, storeId: string | null) {
  const userId = decodeJwt(idToken)?.sub as string;
  const expr = storeId
    ? "SET printfulApiKey = :k, currentStoreId = :s"
    : "SET printfulApiKey = :k, currentStoreId = :n";

  const values: any = { ":k": { S: apiKey } };
  if (storeId) values[":s"] = { S: storeId };
  else values[":n"] = { NULL: true };

  await ddb.send(new UpdateItemCommand({
    TableName: DDB_TABLE_MUSE_USERS,
    Key: { userId: { S: userId } },
    UpdateExpression: expr,
    ExpressionAttributeValues: values,
  }));
}

// remove API key + store selection
export async function clearPrintfulKeyAndStore(idToken: string) {
  const userId = decodeJwt(idToken)?.sub as string;
  await ddb.send(new UpdateItemCommand({
    TableName: DDB_TABLE_MUSE_USERS,
    Key: { userId: { S: userId } },
    UpdateExpression: "REMOVE printfulApiKey, currentStoreId",
  }));
}