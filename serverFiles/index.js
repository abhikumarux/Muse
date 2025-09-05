const express = require("express");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");

const app = express();
app.use(express.json());

const client = new DynamoDBClient({ region: "us-east-2" });
const dynamo = DynamoDBDocumentClient.from(client);

app.get("/", (req, res) => res.send("✅ Hello from your EC2 server!"));

app.post("/user", async (req, res) => {
  const { UserId, Email } = req.body;
  if (!UserId || !Email) return res.status(400).send("Missing required fields");
  const params = { TableName: "User", Item: { "User Id": Number(UserId), Email } };
  try {
    await dynamo.send(new PutCommand(params));
    res.send("User added successfully");
  } catch (err) {
    res.status(500).send("Failed to add user");
  }
});

app.get("/users", async (req, res) => {
  try {
    const data = await dynamo.send(new ScanCommand({ TableName: "User" }));
    res.json(data.Items || []);
  } catch (err) {
    res.status(500).send("Failed to fetch users");
  }
});

app.listen(3000, () => console.log("🚀 Server running on port 3000"));
