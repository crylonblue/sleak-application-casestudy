import { notFound } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge, isProcessing } from '@/components/ui/status-badge'
import { feedbackSchema } from '@/lib/ai/feedback-schema'
import { getOwnConversation, getRecordingSignedUrl } from '@/lib/data-access/conversations'
import { ConversationActions } from './conversation-actions'
import { FeedbackView } from './feedback-view'
import { ProcessingRefresh } from './processing-refresh'

function formatDuration(seconds: number | null) {
    if (seconds == null) return null
    const total = Math.round(seconds)
    const m = Math.floor(total / 60)
    const s = total % 60
    return `${m}:${s.toString().padStart(2, '0')}`
}

export default async function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const conversation = await getOwnConversation(id)
    if (!conversation) notFound()

    const audioUrl = await getRecordingSignedUrl(conversation.recording_path)
    const duration = formatDuration(conversation.duration_seconds)
    const parsedFeedback = conversation.analysis ? feedbackSchema.safeParse(conversation.analysis) : null
    const feedback = parsedFeedback?.success ? parsedFeedback.data : null

    return (
        <>
            <SiteHeader
                breadcrumbs={[
                    { title: 'Conversations', link: '/conversations' },
                    { title: conversation.title },
                ]}
            />
            {isProcessing(conversation.status) && <ProcessingRefresh />}
            <main className="@container/main flex flex-1 flex-col gap-2">
                <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 lg:px-6">
                    <header className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-semibold tracking-tight">{conversation.title}</h1>
                                <StatusBadge status={conversation.status} />
                            </div>
                            <p className="text-muted-foreground text-sm">
                                Uploaded {new Date(conversation.created_at).toLocaleString()}
                                {duration && ` · ${duration}`}
                            </p>
                        </div>
                        <ConversationActions id={conversation.id} currentTitle={conversation.title} />
                    </header>

                    {conversation.status === 'failed' && (
                        <Alert variant="destructive">
                            <AlertTitle>Analysis failed</AlertTitle>
                            <AlertDescription>
                                {conversation.error ?? 'Something went wrong while processing this recording.'}
                            </AlertDescription>
                        </Alert>
                    )}

                    {audioUrl && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Recording</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <audio controls preload="metadata" className="w-full" src={audioUrl}>
                                    Your browser does not support audio playback.
                                </audio>
                            </CardContent>
                        </Card>
                    )}

                    {isProcessing(conversation.status) && <ProcessingPanel status={conversation.status} />}

                    {feedback && <FeedbackView feedback={feedback} />}

                    {conversation.transcript && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Transcript</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <pre className="text-muted-foreground max-h-96 overflow-y-auto whitespace-pre-wrap font-sans text-sm leading-relaxed">
                                    {conversation.transcript}
                                </pre>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>
        </>
    )
}

function ProcessingPanel({ status }: { status: 'pending' | 'transcribing' | 'analyzing' }) {
    const message =
        status === 'transcribing'
            ? 'Transcribing your call with Deepgram…'
            : status === 'analyzing'
              ? 'Generating coaching feedback with GPT-4.1…'
              : 'Queued — this will start in a moment.'
    return (
        <Card>
            <CardContent className="flex items-center gap-3 py-6">
                <Loader2 className="text-muted-foreground size-5 animate-spin" />
                <p className="text-muted-foreground text-sm">{message}</p>
            </CardContent>
        </Card>
    )
}
