const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const POSTS_TABLE = process.env.POSTS_TABLE;
const { jsonResponse } = require("../../lib/http");

exports.handler = async (event) => {
  const qs = event.queryStringParameters || {};
  const hasAttachmentOnly = qs.has_attachment === "true";

  const result = await ddb.send(
    new QueryCommand({
      TableName: POSTS_TABLE,
      IndexName: hasAttachmentOnly ? "attachment-index" : "feed-index",
      KeyConditionExpression: hasAttachmentOnly ? "has_attachment_flag = :pk" : "feed_pk = :pk",
      ExpressionAttributeValues: { ":pk": hasAttachmentOnly ? "true" : "journal" },
      ScanIndexForward: false,
      Limit: 25,
    })
  );

  return jsonResponse(200, { posts: result.Items || [] });
};
