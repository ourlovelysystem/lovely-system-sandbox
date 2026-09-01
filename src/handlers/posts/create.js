const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, TransactWriteCommand } = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require("crypto");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const POSTS_TABLE = process.env.POSTS_TABLE;
const POST_TAGS_TABLE = process.env.POST_TAGS_TABLE;
const { jsonResponse } = require("../../lib/http");

exports.handler = async (event) => {
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const { author_handle, title, body: postBody, tags, attachment_keys } = body;

  if (!author_handle || typeof author_handle !== "string") {
    return jsonResponse(400, { error: "'author_handle' is required" });
  }
  if (!title || typeof title !== "string") {
    return jsonResponse(400, { error: "'title' is required" });
  }
  if (!postBody || typeof postBody !== "string") {
    return jsonResponse(400, { error: "'body' is required" });
  }

  const normalizedTags = Array.isArray(tags)
    ? [...new Set(tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean))]
    : [];
  const normalizedAttachments = Array.isArray(attachment_keys) ? attachment_keys.filter(Boolean) : [];
  const hasAttachment = normalizedAttachments.length > 0;

  const postId = randomUUID();
  const createdAt = new Date().toISOString();

  const post = {
    post_id: postId,
    feed_pk: "journal",
    author_handle,
    title,
    body: postBody,
    tags: normalizedTags,
    attachment_keys: normalizedAttachments,
    created_at: createdAt,
    ...(hasAttachment ? { has_attachment_flag: "true" } : {}),
  };

  const transactItems = [
    { Put: { TableName: POSTS_TABLE, Item: post } },
    ...normalizedTags.map((tag) => ({
      Put: {
        TableName: POST_TAGS_TABLE,
        Item: {
          tag,
          sort_key: `${createdAt}#${postId}`,
          post_id: postId,
          title,
          author_handle,
          created_at: createdAt,
        },
      },
    })),
  ];

  if (transactItems.length === 1) {
    await ddb.send(new PutCommand({ TableName: POSTS_TABLE, Item: post }));
  } else {
    await ddb.send(new TransactWriteCommand({ TransactItems: transactItems }));
  }

  return jsonResponse(201, post);
};
