import "react-native-get-random-values";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, PutItemCommand, QueryCommand, DeleteItemCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import { Buffer } from "buffer";
import * as FileSystem from "expo-file-system/legacy";
import { v4 as uuidv4 } from "uuid";
import { getIdTokenFromStorage } from "./auth";
import { AWS_REGION, IDENTITY_POOL_ID, USER_POOL_ID, DDB_TABLE_MUSE_PHOTOSHOOTS, S3_UPLOAD_BUCKET } from "./config";

export interface MusePhotoshootRow {
  photoshootId: string;
  userId: string;
  scenarioId?: string;
  scenarioTitle?: string;
  scenarioSummary?: string;
  prompt?: string;
  s3Location?: string;
  createdAt: string;
}

async function makeAwsClients() {
  const idToken = await getIdTokenFromStorage?.();
  if (!idToken) throw new Error("You are not signed in. Please log in again.");

  const creds = await fromCognitoIdentityPool({
    identityPoolId: IDENTITY_POOL_ID,
    clientConfig: { region: AWS_REGION },
    logins: { [`cognito-idp.${AWS_REGION}.amazonaws.com/${USER_POOL_ID}`]: idToken },
  })();

  const ddb = new DynamoDBClient({ region: AWS_REGION, credentials: creds });
  const s3 = new S3Client({ region: AWS_REGION, credentials: creds });

  const payload = idToken.split(".")[1] || "";
  const json = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  const sub = (() => {
    try {
      return JSON.parse(json).sub as string;
    } catch {
      return undefined;
    }
  })();
  if (!sub) throw new Error("Invalid session. Please sign in again.");

  return { ddb, s3, userId: sub };
}

async function readUriToBytes(uri: string): Promise<{ bytes: Buffer; contentType: string; ext: string }> {
  if (uri.startsWith("data:")) {
    const [header, base64] = uri.split(",");
    if (!header || !base64) throw new Error("Invalid data URI format.");
    const contentType = header.match(/:(.*?);/)?.[1] || "application/octet-stream";
    const ext = contentType.split("/")[1] || "bin";
    const bytes = Buffer.from(base64, "base64");
    return { bytes, contentType, ext };
  }

  if (uri.startsWith("http")) {
    const tempLocalUri = FileSystem.cacheDirectory + uuidv4() + ".png";
    await FileSystem.downloadAsync(uri, tempLocalUri);
    const base64 = await FileSystem.readAsStringAsync(tempLocalUri, { encoding: FileSystem.EncodingType.Base64 });
    const bytes = Buffer.from(base64, "base64");
    await FileSystem.deleteAsync(tempLocalUri);
    return { bytes, contentType: "image/png", ext: "png" };
  }

  if (uri.startsWith("file://")) {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const bytes = Buffer.from(base64, "base64");
    return { bytes, contentType: "image/png", ext: "png" };
  }

  throw new Error(`Unsupported URI scheme: ${uri}`);
}

export const savePhotoshoot = async (payload: {
  imageUri: string;
  scenarioId?: string;
  scenarioTitle?: string;
  scenarioSummary?: string;
  prompt?: string;
}) => {
  const { ddb, s3, userId } = await makeAwsClients();
  const photoshootId = uuidv4();
  const createdAt = new Date().toISOString();

  const { bytes, contentType, ext } = await readUriToBytes(payload.imageUri);
  const s3Key = `photoshoots/${userId}/${photoshootId}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: S3_UPLOAD_BUCKET,
      Key: s3Key,
      Body: bytes,
      ContentType: contentType,
    })
  );

  const s3Location = `https://${S3_UPLOAD_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${s3Key}`;

  const dynamoItem: any = {
    photoshootId: { S: photoshootId },
    userId: { S: userId },
    createdAt: { S: createdAt },
    s3Location: { S: s3Location },
  };
  if (payload.scenarioId) dynamoItem.scenarioId = { S: payload.scenarioId };
  if (payload.scenarioTitle) dynamoItem.scenarioTitle = { S: payload.scenarioTitle };
  if (payload.scenarioSummary) dynamoItem.scenarioSummary = { S: payload.scenarioSummary };
  if (payload.prompt) dynamoItem.prompt = { S: payload.prompt };

  await ddb.send(
    new PutItemCommand({
      TableName: DDB_TABLE_MUSE_PHOTOSHOOTS,
      Item: dynamoItem,
    })
  );

  return { photoshootId, userId, ...payload, s3Location, createdAt } as MusePhotoshootRow;
};

export const listPhotoshootsForCurrentUser = async (): Promise<MusePhotoshootRow[]> => {
  const { ddb, userId } = await makeAwsClients();

  const command = new QueryCommand({
    TableName: DDB_TABLE_MUSE_PHOTOSHOOTS,
    KeyConditionExpression: "userId = :userId",
    ExpressionAttributeValues: { ":userId": { S: userId } },
    ScanIndexForward: false,
  });

  const response = await ddb.send(command);

  const rows =
    response.Items?.map((item) => {
      const row: Partial<MusePhotoshootRow> = {};
      for (const [key, value] of Object.entries(item)) {
        // @ts-ignore
        row[key as keyof MusePhotoshootRow] = value.S || value.N;
      }
      return row as MusePhotoshootRow;
    }) || [];

  rows.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return rows;
};

export const deletePhotoshoot = async (photoshootId: string) => {
  const { ddb, s3, userId } = await makeAwsClients();

  const itemResult = await ddb.send(
    new GetItemCommand({
      TableName: DDB_TABLE_MUSE_PHOTOSHOOTS,
      Key: { userId: { S: userId }, photoshootId: { S: photoshootId } },
    })
  );

  const s3Location = itemResult.Item?.s3Location?.S;
  if (s3Location) {
    const s3Key = s3Location.split(".com/")[1];
    if (s3Key) {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: S3_UPLOAD_BUCKET,
          Key: s3Key,
        })
      );
    }
  }

  await ddb.send(
    new DeleteItemCommand({
      TableName: DDB_TABLE_MUSE_PHOTOSHOOTS,
      Key: {
        photoshootId: { S: photoshootId },
        userId: { S: userId },
      },
    })
  );
};
