import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import { AWS_REGION, IDENTITY_POOL_ID, USER_POOL_ID } from "./config";
import { getIdTokenFromStorage } from "./auth";

export const ddb = new DynamoDBClient({
  region: AWS_REGION,
  credentials: async () => {
    const idToken = await getIdTokenFromStorage();
    if (!idToken) {
      throw new Error("You are not signed in. Please log in again.");
    }

    // fromCognitoIdentityPool will exchange the token for authenticated creds
    return fromCognitoIdentityPool({
      identityPoolId: IDENTITY_POOL_ID,
      clientConfig: { region: AWS_REGION },
      logins: {
        [`cognito-idp.${AWS_REGION}.amazonaws.com/${USER_POOL_ID}`]: idToken,
      },
    })();
  },
});
