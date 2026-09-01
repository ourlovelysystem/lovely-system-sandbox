const {
  ChimeSDKMeetingsClient,
  CreateMeetingCommand,
  CreateAttendeeCommand,
  StartMeetingTranscriptionCommand,
} = require("@aws-sdk/client-chime-sdk-meetings");
const { randomUUID } = require("crypto");

const RECORDINGS_BUCKET = process.env.RECORDINGS_BUCKET;
const meetingsClient = new ChimeSDKMeetingsClient({});

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
    actions = [];
  }

  return {
    SchemaVersion: "1.0",
    Actions: actions,
  };
};
