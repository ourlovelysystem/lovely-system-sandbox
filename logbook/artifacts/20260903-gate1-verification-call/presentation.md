# Presentation: Green State verification call

This is the write-up presented to Will Daly in-session, reproduced here
alongside the raw data it was built from (`transcript.md`,
`cloudwatch_logs_raw.json`, `call_audio.wav`, all in this directory).

## 1. Bringing infrastructure to ready

Before the call, the KVS consumer Fargate service (idled overnight at
Will's instruction to hold down cost) was scaled back to `desiredCount: 1`
and confirmed to reach `runningCount: 1` at steady state. The ALB target
group was independently confirmed `healthy`. The SIP rule was confirmed
pointing this reference architecture's SIP media application — not the
other project's — at +1 730-265-5549, the correct number to call.

## 2. Suggested demo questions

Before the call, these categories of questions were suggested to exercise
the pipeline honestly, including one deliberately chosen to expose a real
architectural limit rather than only show favorable results:

- **Knowledge/reasoning**: tallest mountain in South America; a multi-step
  arithmetic word problem; explaining how a rainbow forms.
- **Judgment/synthesis**: virus vs. bacteria; a reason to visit Portugal.
- **A stateless-context probe**: asking a factual question, then a follow-up
  that only makes sense with memory of the first answer ("What's the capital
  of France?" → "What's the population of that city?") — because the code
  (`src/resources/kvsConsumer/src/index.ts`) sends each transcribed question
  to Bedrock as an isolated single-turn prompt with no prior-turn context.
- **TTS sanity check**: a question whose answer contains a short list, to
  hear how the read-back handles it given the pipeline's minimal text
  cleanup (`'` → `'`, `:` → `.`, strips newlines).

## 3. What happened on the call

14 utterances were transcribed over a 341.8-second (~5.7 minute) call. All
substantive questions were answered correctly. The two incidental
"incomplete utterance" transcripts (mid-sentence Transcribe partial-turn
artifacts) were handled gracefully by the model, which correctly asked for
the missing question rather than fabricating an answer. One transcription
error ("eat 1" heard as "each 1") flowed through faithfully to a different
but internally-consistent Bedrock answer — a Transcribe accuracy issue, not
a Bedrock or pipeline defect. The stateless-context probe worked exactly as
predicted: the follow-up "For the population of that city" got no memory of
"Paris" and the model correctly said so rather than guessing.

Full question-by-question detail is in `transcript.md` in this directory.

## 4. Verification, not just observation

Rather than accept the CloudWatch transcript as the full story, the raw
caller audio was independently recovered from the KVS stream (1-hour
retention) with a full-duration `GetMedia` pull — not a short sample — and
every one of the 14 transcribed utterances was checked against actual speech
energy in that recovered audio at its reported offset. **14 of 14 matched.**
That cross-check, and its method, is recorded in full in `transcript.md`.

## 5. Conclusion

This constitutes the audible proof step of the Gate 1 plan recorded
previously in this logbook — readiness prompt → streaming transcription →
Bedrock answer spoken to the caller — demonstrated across 14 real exchanges
in one call, with the pipeline's one architectural limitation (no
cross-question memory) both predicted in advance and observed exactly as
predicted, rather than discovered by accident.
