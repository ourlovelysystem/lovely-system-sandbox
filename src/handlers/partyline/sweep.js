const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { endCall, docClient, CALLS_TABLE } = require("./lib/end-call");

const MAX_MEETING_AGE_MS =
  Number(process.env.MAX_MEETING_HOURS || "4") * 60 * 60 * 1000;

exports.handler = async () => {
  const scan = await docClient.send(new ScanCommand({ TableName: CALLS_TABLE }));
  const now = Date.now();

  for (const record of scan.Items || []) {
    const age = now - record.created_at;
    if (age >= MAX_MEETING_AGE_MS) {
      console.log(
        `Sweeping call ${record.call_id}, meeting ${record.meeting_id}, age ${Math.round(age / 60000)}m`
      );
      await endCall(record.call_id, record);
    }
  }
};
