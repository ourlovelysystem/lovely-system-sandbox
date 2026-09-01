# Party Line Helpdesk — Specification

## Status

Alpha framework, pre-implementation. This document records what was decided
during design discussion and what remains open. Where a choice originated as
a recommendation rather than an explicit decision by the operator, it is
marked as such — this document does not treat "wasn't objected to" as the
same thing as "was confirmed."

## Concept

Callers dial in and join a shared, continuous conference bridge — a party
line, not a private 1-to-1 support call. Guides are present on the same
bridge, listening to callers' problems directly. A voice-driven system,
audible to everyone on the bridge, can be invoked by either a guide or a
caller mid-conversation.

## Confirmed decisions

These were stated explicitly by the operator, not inferred from silence.

- **The bridge is shared, not private.** Multiple callers and guides occupy
  the same continuous line. This is the defining, load-bearing property of
  the concept, not an implementation detail.
- **The bridge is continuous.** It persists indefinitely with fluid
  membership — people join and leave freely — rather than existing as a
  scheduled, bounded meeting with a fixed start and end.
- **System responses are public, not whispered to one party.** "It'll be
  like a hey siri... an Alexa in the room" — the system speaks into the
  shared bridge, audible to everyone present, the same way a physical
  smart speaker in a room would be heard by everyone in it. This resolves
  an earlier open question (public vs. guide-only-private response) in
  favor of public.
- **Trigger mechanism is voice, not touch-tone.** "We can listen and
  transcribe and select for keywords in the output." The system listens
  continuously and is invoked by keyword/phrase detection in the live
  transcript, not by DTMF. This keeps the caller's and guide's ability to
  invoke the system symmetric — either party can speak the trigger.
- **Invocation runs through a routed, growing set of handlers.** "We can
  trigger lambdas." Detected keywords route to individual Lambda-backed
  handlers, not a single monolithic response path — this is the mechanism
  by which the system is meant to grow over time: new capability means a
  new handler added to the router, not a change to the listening or
  triggering layer underneath it.
- **The literal Alexa platform (Echo hardware, Alexa Skills Kit) is
  rejected as the implementation vehicle.** "Alexa buys me someone else's
  assumptions. Not a fit here so I drop it." Alexa's actual design assumes
  one device, one nearby speaker, proximity audio — there is no native way
  for it to listen into a multi-party phone bridge. The *pattern* Alexa
  represents (always listening, wake phrase, routed skill, spoken
  response) is what's being kept; the product itself is not.
- **Breakaway/private sub-rooms are explicitly deferred**, not designed
  in and not designed out. "Breakaway rooms something to consider post
  alpha." The alpha framework assumes everyone present is on the one
  shared bridge.
- **Whether callers overhearing each other's problems is a deliberate
  feature or an accepted tradeoff of the shared-bridge model is an open
  question the operator chose not to resolve yet.** "My whiskers detect
  rabbit holes. I choose not to enter at this time." This is not settled
  by this document, and should not be treated as decided in either
  direction.

## Proposed, not yet confirmed

These emerged as recommendations during the framework discussion. The
operator did not push back on them, but also did not individually ratify
each one — they should be treated as the current best proposal, not as
locked-in decisions, until confirmed.

- **Amazon Chime SDK** for the bridge/hosting layer, over Amazon Connect.
  Reasoning offered: Connect is built around 1-to-1 routed contacts with
  conferencing as a bolt-on; Chime SDK's primitives (PSTN dial-in,
  multi-party audio, media capture) are a more native fit for "many
  people, one ongoing room."
- **Live transcription requires bridging into a Chime SDK Meeting —
  corrected from an earlier wrong assumption.** This document originally
  proposed live transcription as if it were a direct action on the SMA
  call, parallel to `StartCallRecording`. Checked directly against AWS's
  own documented list of supported SIP Media Application actions: there
  is no such action. The actual path is `CreateMeeting` + `CreateAttendee`
  (AWS SDK calls from the Lambda) to create a Chime SDK Meeting, then the
  `JoinChimeMeeting` action to bridge the phone call's leg into it, then
  `StartMeetingTranscription` (confirmed to exist, but for Meetings only)
  on that meeting. This is a materially bigger step than the original
  framework implied — the call becomes a participant in a second Chime
  SDK resource, not just an SMA call with an extra action turned on.
  Batch (post-call) transcription on the recorded S3 file remains a
  simpler possible alpha fallback if this bridging step turns out to be
  more than is needed at first.
- **Transcribe's built-in PII redaction** for the redaction stage, rather
  than a separate post-processing tool — chosen because it produces a
  redacted transcript directly rather than requiring a second pass.
- **Amazon Bedrock** as the single reasoning layer behind both invocation
  paths — live (triggered by keyword, answering into the bridge) and
  post-call (computational analysis of the completed transcript). This
  mirrors the pattern already in production use in the sibling
  `lovely-system-pledge` project, which evaluates transcripts via Bedrock
  for a different purpose (semantic match scoring).
- **Amazon Polly** for speech synthesis, bringing the system's response in
  as a speaking participant on the Chime SDK bridge.

## Alpha acceptance target

Stated directly by the operator as the concrete proof-of-concept, deliberately
smaller than the full framework:

> "I am talking on the line. I am being recorded. I am being transcribed. I
> am on a line that others can join. I speak a key phrase. Give me a drum
> roll on that. I get a drum roll."

This exercises the bridge, recording, live transcription, and keyword-trigger
stages end to end, with the response deliberately simplified to a
pre-recorded sound clip rather than full Bedrock reasoning and Polly speech
— proving the pipeline's shape before building out the skill router's actual
intelligence.

## Architecture sketch

```
Continuous bridge (proposed: Chime SDK, SIP Media Application)
  → recorded to S3
  → CreateMeeting + CreateAttendee → JoinChimeMeeting (bridges call into a
    Chime SDK Meeting) → StartMeetingTranscription
      → keyword match → skill router → Lambda → Bedrock reasoning
          → Polly speaks the response into the bridge
      → post-call: PII redaction (proposed: Transcribe native redaction)
          → Bedrock computational analysis
```

One reasoning layer (Bedrock) serves two different invocation paths: live,
triggered by a spoken keyword during the call, and after-the-fact, run
against the completed and redacted transcript. The skill router is the
single extension point — new capability is added there, not upstream.

## Recording continuity for a continuous bridge — options considered

A real constraint surfaced during testing: `StartCallRecording` has no native
segment or rolling parameter, and the recording file is only delivered to S3
once the recording actually stops. For a bridge meant to stay open for hours
or days, a single ongoing recording would produce nothing accessible until
the entire session finally ends. Four options were identified. None is
marked as the recommendation here — presented for comparison, not ranked.

**A — Leg rotation.** The host holds the bridge open continuously, with no
recording tied to their own leg. Two auxiliary legs take turns being the
one actively recording, joining with a deliberate overlap window before the
previous one disconnects, so there's no gap in coverage. Each rotation
produces its own delivered file the moment that leg ends. Pros: the host's
connection is never interrupted by the rotation; avoids repeatedly
stopping and restarting recording on one continuously-held leg. Cons:
requires maintaining and coordinating extra call legs solely for recording,
which — since Chime SDK Voice bills per minute per leg — roughly doubles or
triples the telephony cost of the session; timing/handoff logic is real
added complexity, with a real failure mode if a rotation leg fails to
connect within the overlap window; depends on an assumption not yet
confirmed for true multi-party bridges specifically (see Open Questions).

**B — Stop/start on a single leg.** Periodically call `StopCallRecording`
then `StartCallRecording` again on the same one dedicated leg, on a timer.
Pros: no extra call legs, no added per-minute telephony cost, simpler to
reason about than rotation. Cons: creates an actual gap in recorded
coverage during each stop-then-start transition; the size of that gap
hasn't been measured.

**C — One file per session, accept the delivery-on-stop behavior as-is.**
Don't roll at all — record continuously and let the file deliver whenever
the session actually ends. Pros: simplest possible implementation, uses
the API exactly as documented, no coordination logic. Cons: only viable if
"continuous" is redefined around naturally bounded individual sessions
(e.g., a single caller's time on the bridge) rather than the bridge's own
multi-day lifetime; as a strategy for a truly long-lived room, this means
long stretches with nothing recorded-and-accessible.

**D — Raw audio streaming via Kinesis Video Streams**, bypassing the
record-to-S3 action entirely. Chime SDK Voice can stream call audio live
to KVS per call leg, which is inherently a continuous-append model rather
than a stop-triggers-delivery one. Pros: closest fit to genuinely
continuous access, no rotation or gap logic needed. Cons: everything found
describing this documents it specifically for Voice Connector-product
numbers; this account's number was deliberately switched to
`SipMediaApplicationDialIn`, so whether this applies unchanged is
unverified; would require building file-segmentation from the raw stream
rather than getting ready-made WAV files from the API.

## Explicitly out of scope for alpha

- Breakaway/private sub-rooms.
- Any mechanism for selectively muting or isolating callers from each
  other. The alpha bridge is fully shared by design; whether that should
  change is the deferred question noted above, not a task for this phase.

## Open questions

- Public/private overhearing between callers (deferred by operator,
  see above).
- Whether streaming or batch transcription is the right alpha starting
  point.
- Whether `Track: BOTH` on one participant's leg captures the full mixed
  audio of every participant in a true multi-party (3+) bridge, or only
  that leg's own two-way audio. Confirmed for two-party calls; not yet
  confirmed for genuine multi-party bridges. Directly relevant to
  Recording Option A above, which depends on it — worth an actual 3-way
  test call before relying on it.
- Which of the four recording-continuity options (see above) to build,
  and whether that decision should wait for the multi-party audio
  question to be resolved first.
- Whether Chime SDK vs. Connect, and the specific AWS services named
  under "Proposed, not yet confirmed," should be locked in as written or
  revisited.
