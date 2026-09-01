const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require("crypto");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const COMMENTS_TABLE = process.env.COMMENTS_TABLE;
const POSTS_TABLE = process.env.POSTS_TABLE;
const { jsonResponse } = require("../../lib/http");

exports.handler = async (event) => {
  const postId = event.pathParameters && event.pathParameters.post_id;
  if (!postId) {
    return jsonResponse(400, { error: "post_id is required" });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const { author_handle, body: commentBody } = body;
  if (!author_handle || typeof author_handle !== "string") {
    return jsonResponse(400, { error: "'author_handle' is required" });
  }
  if (!commentBody || typeof commentBody !== "string") {
    return jsonResponse(400, { error: "'body' is required" });
  }

  const postCheck = await ddb.send(new GetCommand({ TableName: POSTS_TABLE, Key: { post_id: postId } }));
  if (!postCheck.Item) {
    return jsonResponse(404, { error: "Post not found" });
  }

  const comment = {
    post_id: postId,
    comment_id: randomUUID(),
    author_handle,
    body: commentBody,
    created_at: new Date().toISOString(),
  };

  await ddb.send(new PutCommand({ TableName: COMMENTS_TABLE, Item: comment }));

  return jsonResponse(201, comment);
};
