import 'server-only'
import { AzureChatOpenAI } from '@langchain/openai'
import { feedbackSchema, type Feedback } from './feedback-schema'

const SYSTEM_PROMPT = `You are an expert sales coach reviewing a recorded sales conversation.
You will receive a transcript of a sales call. Analyze it as if you were giving the salesperson
honest, actionable coaching feedback.

Be specific, evidence-based, and constructive. Quote or paraphrase the transcript when citing evidence.
Focus on rapport, discovery, value articulation, objection handling, and clear next steps.
If the transcript is too short or off-topic to assess, still produce structured output and call that
out in the summary.`

let cachedModel: AzureChatOpenAI | null = null
function getModel() {
    if (!cachedModel) {
        const required = [
            'AZURE_OPENAI_API_KEY',
            'AZURE_OPENAI_API_INSTANCE_NAME',
            'AZURE_OPENAI_API_DEPLOYMENT_NAME',
            'AZURE_OPENAI_API_VERSION',
        ]
        for (const k of required) if (!process.env[k]) throw new Error(`${k} is not configured`)

        cachedModel = new AzureChatOpenAI({
            azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
            azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
            azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
            azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
            temperature: 0.2,
        })
    }
    return cachedModel
}

export async function analyzeTranscript(transcript: string): Promise<Feedback> {
    const model = getModel()
    const structured = model.withStructuredOutput(feedbackSchema, { name: 'sales_call_feedback' })
    return await structured.invoke([
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Transcript:\n\n${transcript}` },
    ])
}
