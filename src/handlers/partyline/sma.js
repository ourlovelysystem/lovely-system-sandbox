const RECORDINGS_BUCKET = process.env.RECORDINGS_BUCKET;

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
  } else if (invocationType === "HANGUP") {
    actions = [];
  }

  return {
    SchemaVersion: "1.0",
    Actions: actions,
  };
};
