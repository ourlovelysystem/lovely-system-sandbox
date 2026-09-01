const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const POSTS_TABLE = process.env.POSTS_TABLE;
const { jsonResponse } = require("../../lib/http");

exports.handler = async (event) => {
  const postId = event.pathParameters && event.pathParameters.post_id;
  if (!postId) {
    return jsonResponse(400, { error: "post_id is required" });
  }

  const result = await ddb.send(new GetCommand({ TableName: POSTS_TABLE, Key: { post_id: postId } }));

  if (!result.Item) {
    return jsonResponse(404, { error: "Post not found" });
  }

  return jsonResponse(200, result.Item);
};
