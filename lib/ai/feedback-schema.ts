import { z } from 'zod'

export const feedbackSchema = z.object({
    summary: z.string().describe('Two to three sentence summary of how the call went and what was discussed.'),
    overall_score: z
        .number()
        .min(0)
        .max(10)
        .describe('Overall sales effectiveness on a 0-10 scale, where 10 is exemplary.'),
    strengths: z
        .array(
            z.object({
                point: z.string().describe('One short sentence naming the strength.'),
                evidence: z.string().describe('A brief quote or paraphrase from the transcript that demonstrates it.'),
            }),
        )
        .max(5)
        .describe('What the salesperson did well, with evidence.'),
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
        .describe('Where the salesperson could improve, with concrete suggestions.'),
    next_steps: z
        .array(z.string())
        .max(5)
        .describe('Concrete next-step actions the salesperson should take after this call.'),
})

export type Feedback = z.infer<typeof feedbackSchema>
