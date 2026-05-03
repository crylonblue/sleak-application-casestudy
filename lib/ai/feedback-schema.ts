import { z } from 'zod'

export const feedbackSegmentSchema = z.object({
    title: z
        .string()
        .describe(
            'Distinct, ≤ 5 word title in sentence case. Examples: "Introduction", "Discovery questions", ' +
                '"Pricing pushback", "Closing".',
        ),
    summary: z.string().describe('One sentence on what happens in this segment of the call.'),
    start_seconds: z
        .number()
        .describe(
            'Inclusive start of this segment, in seconds from the beginning of the call. ' +
                'The first segment must start at 0.',
        ),
    end_seconds: z
        .number()
        .describe(
            'Exclusive end of this segment, in seconds. Must equal the next segment\'s start_seconds — ' +
                'segments are contiguous with no gaps and no overlaps. The last segment\'s end equals the call duration.',
        ),
    strengths: z
        .array(z.string())
        .max(3)
        .describe('Up to 3 short, specific strengths of the salesperson scoped to *this segment only*.'),
    improvements: z
        .array(z.string())
        .max(3)
        .describe('Up to 3 short, concrete improvements for *this segment only*.'),
})

export const feedbackSchema = z.object({
    title: z
        .string()
        .describe(
            'A concise 5–9 word title summarizing what the call was about, written like a CRM entry. ' +
                'Lead with who and the topic. Examples: "Discovery call with Acme — pricing pushback", ' +
                '"Renewal call with Globex — feature ask". No surrounding quotes.',
        ),
    summary: z.string().describe('Two to three sentence summary of how the call went and what was discussed.'),
    overall_score: z
        .number()
        .min(0)
        .max(10)
        .describe('Overall sales effectiveness on a 0-10 scale, where 10 is exemplary.'),
    rep_speaker_number: z
        .number()
        .int()
        .min(0)
        .describe(
            'Which Deepgram speaker number is the salesperson? Infer from the transcript content — for ' +
                'example, the speaker who introduces themselves, pitches the product, or asks for the close. ' +
                'Default to 0 if the transcript is too sparse to tell.',
        ),
    strengths: z
        .array(
            z.object({
                point: z.string().describe('One short sentence naming the strength.'),
                evidence: z.string().describe('A brief quote or paraphrase from the transcript that demonstrates it.'),
            }),
        )
        .max(5)
        .describe('Top 1–3 strengths across the whole call, with evidence. Distinct from per-segment strengths.'),
    improvements: z
        .array(
            z.object({
                point: z.string().describe('One short sentence naming the issue.'),
                suggestion: z
                    .string()
                    .describe('A concrete, specific suggestion for what to say or do differently next time.'),
                evidence: z.string().describe('A brief quote or paraphrase from the transcript that triggered this.'),
            }),
        )
        .max(5)
        .describe('Top 1–3 improvements across the whole call. Distinct from per-segment improvements.'),
    next_steps: z
        .array(z.string())
        .max(5)
        .describe('Concrete next-step actions the salesperson should take after this call.'),
    segments: z
        .array(feedbackSegmentSchema)
        .min(3)
        .max(8)
        .describe(
            'Logical segments of the call, in order. Choose boundaries where the topic or activity actually ' +
                'changes (intro, discovery, pricing, objection, next steps, closing — pick what fits). ' +
                'Cover the entire call from 0 to total duration with no gaps and no overlaps. ' +
                'Aim for 3–8 segments total.',
        ),
})

export type Feedback = z.infer<typeof feedbackSchema>
export type FeedbackSegment = z.infer<typeof feedbackSegmentSchema>
