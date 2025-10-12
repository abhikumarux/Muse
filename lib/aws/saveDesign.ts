import "react-native-get-random-values";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, PutItemCommand, QueryCommand, DeleteItemCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import { Buffer } from "buffer";
import * as FileSystem from "expo-file-system/legacy";
import { v4 as uuidv4 } from "uuid";
import { getIdTokenFromStorage } from "./auth";
import { AWS_REGION, IDENTITY_POOL_ID, USER_POOL_ID, DDB_TABLE_MUSE_DESIGNS, S3_UPLOAD_BUCKET } from "./config";

// structure of a design row in DynamoDB
export interface MuseDesignRow {
  designId: string;
  userId: string;
  title?: string;
  productName?: string;
  productId?: string;
  variantId?: string;
  size?: string;
  color?: string;
  s3Location?: string;
  prompt?: string;
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


// Reads a URI (file, data, or http) and returns its byte Buffer and content type
async function readUriToBytes(uri: string): Promise<{ bytes: Buffer; contentType: string; ext: string }> {
  if (uri.startsWith("data:")) {
    const [header, base64] = uri.split(",");
    if (!header || !base64) throw new Error("Invalid data URI format.");
    const contentType = header.match(/:(.*?);/)?.[1] || "application/octet-stream";
    const ext = contentType.split("/")[1] || "bin";
    const bytes = Buffer.from(base64, "base64");
    return { bytes, contentType, ext };

  // web URL
  } else if (uri.startsWith("http")) {
    const tempLocalUri = FileSystem.cacheDirectory + uuidv4() + '.png';
    await FileSystem.downloadAsync(uri, tempLocalUri);
    const base64 = await FileSystem.readAsStringAsync(tempLocalUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const bytes = Buffer.from(base64, "base64");

    // clean up the temp file
    await FileSystem.deleteAsync(tempLocalUri);
    return { bytes, contentType: 'image/png', ext: 'png' };

  } else if (uri.startsWith("file://")) {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) throw new Error(`File does not exist at URI: ${uri}`);
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const bytes = Buffer.from(base64, "base64");
    return { bytes, contentType: "image/png", ext: "png" };
  } else {
    throw new Error(`Unsupported URI scheme: ${uri}`);
  }
}


// Save new design to S3 -> DynamoDB
export const saveDesign = async (design: {
  imageUri: string;
  title?: string;
  productName?: string;
  productId?: string;
  variantId?: string;
  size?: string | null;
  color?: string;
  prompt?: string;
}) => {
  const { s3, ddb, userId } = await makeAwsClients();
  const designId = uuidv4();
  const createdAt = new Date().toISOString();

  const { bytes, contentType, ext } = await readUriToBytes(design.imageUri);
  const s3Key = `designs/${userId}/${designId}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: S3_UPLOAD_BUCKET,
      Key: s3Key,
      Body: bytes,
      ContentType: contentType,
    })
  );

  const s3Location = `https://${S3_UPLOAD_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${s3Key}`;

  const designItem: MuseDesignRow = {
    designId,
    userId,
    title: design.title,
    productName: design.productName,
    productId: design.productId,
    variantId: design.variantId,
    size: design.size ?? undefined,
    color: design.color,
    s3Location: s3Location,
    prompt: design.prompt,
    createdAt,
  };

  const itemToPut: any = {};
  for (const [key, value] of Object.entries(designItem)) {
    if (value !== undefined && value !== null) {
      itemToPut[key] = { S: value.toString() };
    }
  }
  itemToPut.designId = { S: designId };
  itemToPut.userId = { S: userId };

  await ddb.send(
    new PutItemCommand({
      TableName: DDB_TABLE_MUSE_DESIGNS,
      Item: itemToPut,
    })
  );

  return designItem;
};

// List all saved designs for the current authenticated user
export const listDesignsForCurrentUser = async (): Promise<MuseDesignRow[]> => {
  const { ddb, userId } = await makeAwsClients();

  const command = new QueryCommand({
    TableName: DDB_TABLE_MUSE_DESIGNS,
    KeyConditionExpression: "userId = :userId",
    ExpressionAttributeValues: { ":userId": { S: userId } },
    ScanIndexForward: false,
  });

  const response = await ddb.send(command);

  const designs =
    response.Items?.map((item) => {
      const row: Partial<MuseDesignRow> = {};
      for (const [key, value] of Object.entries(item)) {
        // @ts-ignore
        row[key as keyof MuseDesignRow] = value.S || value.N;
      }
      return row as MuseDesignRow;
    }) || [];
  
  designs.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  return designs;
};

//Deletes design from both S3 and DynamoDB
export const deleteDesign = async (designId: string) => {
    const { ddb, s3, userId } = await makeAwsClients();

    const itemResult = await ddb.send(new GetItemCommand({
        TableName: DDB_TABLE_MUSE_DESIGNS,
        Key: { userId: { S: userId }, designId: { S: designId } },
    }));

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
            TableName: DDB_TABLE_MUSE_DESIGNS,
            Key: {
                designId: { S: designId },
                userId: { S: userId },
            },
        })
    );
};