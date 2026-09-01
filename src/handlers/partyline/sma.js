const {
  ChimeSDKMeetingsClient,
  CreateMeetingCommand,
  CreateAttendeeCommand,
  StartMeetingTranscriptionCommand,
} = require("@aws-sdk/client-chime-sdk-meetings");
const {
  ChimeSDKMediaPipelinesClient,
  CreateMediaCapturePipelineCommand,
} = require("@aws-sdk/client-chime-sdk-media-pipelines");
const { PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require("crypto");
const { endCall, docClient, CALLS_TABLE } = require("./lib/end-call");

const RECORDINGS_BUCKET = process.env.RECORDINGS_BUCKET;
const CAPTURE_BUCKET = process.env.CAPTURE_BUCKET;
const meetingsClient = new ChimeSDKMeetingsClient({});
const mediaPipelinesClient = new ChimeSDKMediaPipelinesClient({});

exports.handler = async (event) => {
  console.log("SMA event:", JSON.stringify(event));

  const invocationType = event.InvocationEventType;
  let actions = [];

  if (invocationType === "NEW_INBOUND_CALL") {
    actions = [{ Type: "Answer", Parameters: {} }];
  } else if (
    invocationType === "ACTION_SUCCESSFUL" &&
    event.ActionData &&
    event.ActionData.Type === "Answer"
  ) {
    const callId = event.ActionData.Parameters.CallId;
    actions = [
      {
        Type: "StartCallRecording",
        Parameters: {
          CallId: callId,
          Track: "BOTH",
          Destination: {
            Type: "S3",
            Location: `s3://${RECORDINGS_BUCKET}/recordings/`,
          },
        },
      },
      {
        Type: "Speak",
        Parameters: {
          Text: "Hello. You have reached the party line test system. This call is now connected and being recorded.",
          Engine: "neural",
          LanguageCode: "en-US",
          TextType: "text",
        },
      },
    ];
  } else if (
    invocationType === "ACTION_SUCCESSFUL" &&
    event.ActionData &&
    event.ActionData.Type === "Speak"
  ) {
    const callId = event.ActionData.Parameters.CallId;
    const meeting = await meetingsClient.send(
      new CreateMeetingCommand({
        ClientRequestToken: randomUUID(),
        MediaRegion: "us-east-1",
        ExternalMeetingId: `partyline-${Date.now()}`,
      })
    );
    const meetingId = meeting.Meeting.MeetingId;

    const attendee = await meetingsClient.send(
      new CreateAttendeeCommand({
        MeetingId: meetingId,
        ExternalUserId: `caller-${randomUUID()}`,
      })
    );

    const pipeline = await mediaPipelinesClient.send(
      new CreateMediaCapturePipelineCommand({
        SourceType: "ChimeSdkMeeting",
        SourceArn: meeting.Meeting.MeetingArn,
        SinkType: "S3Bucket",
        SinkArn: `arn:aws:s3:::${CAPTURE_BUCKET}`,
        ChimeSdkMeetingConfiguration: {
          ArtifactsConfiguration: {
            Audio: { MuxType: "AudioOnly" },
            Video: { State: "Disabled" },
            Content: { State: "Disabled" },
          },
        },
      })
    );

    await docClient.send(
      new PutCommand({
        TableName: CALLS_TABLE,
        Item: {
          call_id: callId,
          meeting_id: meetingId,
          pipeline_id: pipeline.MediaCapturePipeline.MediaPipelineId,
          created_at: Date.now(),
        },
      })
    );

    actions = [
      {
        Type: "JoinChimeMeeting",
        Parameters: {
          JoinToken: attendee.Attendee.JoinToken,
          CallId: callId,
          MeetingId: meetingId,
        },
      },
    ];
  } else if (
    invocationType === "ACTION_SUCCESSFUL" &&
    event.ActionData &&
    event.ActionData.Type === "JoinChimeMeeting"
  ) {
    const meetingId = event.ActionData.Parameters.MeetingId;
    await meetingsClient.send(
      new StartMeetingTranscriptionCommand({
        MeetingId: meetingId,
        TranscriptionConfiguration: {
          EngineTranscribeSettings: {
            LanguageCode: "en-US",
            Region: "us-east-1",
          },
        },
      })
    );
    actions = [];
  } else if (invocationType === "HANGUP") {
    const callId = event.ActionData.Parameters.CallId;
    const record = await docClient.send(
      new GetCommand({ TableName: CALLS_TABLE, Key: { call_id: callId } })
    );

    if (record.Item) {
      await endCall(callId, record.Item);
    }

    actions = [];
  }

  return {
    SchemaVersion: "1.0",
    Actions: actions,
  };
};
