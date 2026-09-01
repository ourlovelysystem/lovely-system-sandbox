const {
  ChimeSDKMeetingsClient,
  DeleteMeetingCommand,
} = require("@aws-sdk/client-chime-sdk-meetings");
const {
  ChimeSDKMediaPipelinesClient,
  DeleteMediaCapturePipelineCommand,
} = require("@aws-sdk/client-chime-sdk-media-pipelines");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");

const CALLS_TABLE = process.env.CALLS_TABLE;
const meetingsClient = new ChimeSDKMeetingsClient({});
const mediaPipelinesClient = new ChimeSDKMediaPipelinesClient({});
const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

async function endCall(callId, record) {
  await mediaPipelinesClient.send(
    new DeleteMediaCapturePipelineCommand({
      MediaPipelineId: record.pipeline_id,
    })
  );
  await meetingsClient.send(
    new DeleteMeetingCommand({ MeetingId: record.meeting_id })
  );
  await docClient.send(
    new DeleteCommand({ TableName: CALLS_TABLE, Key: { call_id: callId } })
  );
}

module.exports = { endCall, docClient, CALLS_TABLE };
