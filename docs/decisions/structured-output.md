# Structured output via LangChain

**What:** `lib/ai/analyze.ts` uses
`@langchain/openai`'s `AzureChatOpenAI` +
`withStructuredOutput(feedbackSchema)` instead of raw OpenAI function
calling.

**Why:**

- LangChain handles the function-calling plumbing.
- Validates the response against the same zod schema we use to decode
  `analysis` jsonb on the detail page — one source of truth for the
  shape.
- Easy to extend (`segments`, `rep_speaker_number`, etc) by editing
  the schema; descriptions on each field flow through to the model.

**Cost:** an extra dependency (`langchain` + `@langchain/openai` +
`@langchain/core`) and a tiny indirection compared to a direct SDK call.

**See also:** [[ai-pipeline]].
