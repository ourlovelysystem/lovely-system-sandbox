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
- **Amazon Transcribe, streaming mode**, for live transcription — feeding
  both the keyword-trigger detection and, after the call, redaction and
  analysis. Batch (post-call) transcription was named as a simpler
  possible alpha fallback if streaming proves to be more than is needed
  at first.
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

## Architecture sketch

```
Continuous bridge (proposed: Chime SDK)
  → recorded to S3
  → streaming transcription (proposed: Transcribe, streaming mode)
      → keyword match → skill router → Lambda → Bedrock reasoning
          → Polly speaks the response into the bridge
      → post-call: PII redaction (proposed: Transcribe native redaction)
          → Bedrock computational analysis
```

One reasoning layer (Bedrock) serves two different invocation paths: live,
triggered by a spoken keyword during the call, and after-the-fact, run
against the completed and redacted transcript. The skill router is the
single extension point — new capability is added there, not upstream.

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
- Whether Chime SDK vs. Connect, and the specific AWS services named
  under "Proposed, not yet confirmed," should be locked in as written or
  revisited.
