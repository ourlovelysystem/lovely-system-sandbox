const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const POSTS_TABLE = process.env.POSTS_TABLE;
const { jsonResponse } = require("../../lib/http");

exports.handler = async (event) => {
  const authorHandle = event.pathParameters && event.pathParameters.author_handle;
  if (!authorHandle) {
    return jsonResponse(400, { error: "author_handle is required" });
  }

  const result = await ddb.send(
    new QueryCommand({
      TableName: POSTS_TABLE,
      IndexName: "author-index",
      KeyConditionExpression: "author_handle = :author",
      ExpressionAttributeValues: { ":author": decodeURIComponent(authorHandle) },
      ScanIndexForward: false,
      Limit: 25,
    })
  );

  return jsonResponse(200, { posts: result.Items || [] });
};
