const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { randomUUID } = require("crypto");

const s3 = new S3Client({});
const BUCKET = process.env.ATTACHMENTS_BUCKET;
const { jsonResponse } = require("../../lib/http");

exports.handler = async (event) => {
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const { filename, content_type } = body;
  if (!filename || typeof filename !== "string") {
    return jsonResponse(400, { error: "'filename' is required" });
  }

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `attachments/${randomUUID()}-${safeName}`;

  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: content_type || "application/octet-stream",
    }),
    { expiresIn: 300 }
  );

  return jsonResponse(200, { key, upload_url: uploadUrl, expires_in_seconds: 300 });
};
