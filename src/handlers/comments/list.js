const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const COMMENTS_TABLE = process.env.COMMENTS_TABLE;
const { jsonResponse } = require("../../lib/http");

exports.handler = async (event) => {
  const postId = event.pathParameters && event.pathParameters.post_id;
  if (!postId) {
    return jsonResponse(400, { error: "post_id is required" });
  }

  const result = await ddb.send(
    new QueryCommand({
      TableName: COMMENTS_TABLE,
      KeyConditionExpression: "post_id = :pid",
      ExpressionAttributeValues: { ":pid": postId },
      ScanIndexForward: true,
    })
  );

  return jsonResponse(200, { comments: result.Items || [] });
};
