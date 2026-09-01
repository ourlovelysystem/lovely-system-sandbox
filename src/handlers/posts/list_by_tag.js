const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const POST_TAGS_TABLE = process.env.POST_TAGS_TABLE;
const { jsonResponse } = require("../../lib/http");

exports.handler = async (event) => {
  const tag = event.pathParameters && event.pathParameters.tag;
  if (!tag) {
    return jsonResponse(400, { error: "tag is required" });
  }

  const result = await ddb.send(
    new QueryCommand({
      TableName: POST_TAGS_TABLE,
      KeyConditionExpression: "tag = :tag",
      ExpressionAttributeValues: { ":tag": decodeURIComponent(tag).toLowerCase() },
      ScanIndexForward: false,
      Limit: 25,
    })
  );

  return jsonResponse(200, { posts: result.Items || [] });
};
