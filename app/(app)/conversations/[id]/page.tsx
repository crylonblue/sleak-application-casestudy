import { notFound } from 'next/navigation'
import { SiteHeader } from '@/components/site-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge, isProcessing } from '@/components/ui/status-badge'
import { feedbackSchema } from '@/lib/ai/feedback-schema'
import {
    getOwnConversation,
    getRecordingSignedUrl,
    getTranscriptSegments,
} from '@/lib/data-access/conversations'
import { ConversationActions } from './conversation-actions'
import { FeedbackView } from './feedback-view'
import { ProcessingPanel } from './processing-panel'
import { RecordingPlayer } from './recording-player'
import { SegmentFeedback } from './segment-feedback'
import { SegmentTimeline } from './segment-timeline'
import { TranscriptView } from './transcript-view'

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

    const [audioUrl, transcriptSegments] = await Promise.all([
        getRecordingSignedUrl(conversation.recording_path),
        getTranscriptSegments(conversation.id),
    ])
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
                                <RecordingPlayer src={audioUrl} />
                                {feedback?.segments && feedback.segments.length > 0 && (
                                    <SegmentTimeline segments={feedback.segments} />
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {isProcessing(conversation.status) && (
                        <ProcessingPanel conversationId={conversation.id} status={conversation.status} />
                    )}

                    {feedback && <FeedbackView feedback={feedback} />}

                    {feedback && feedback.segments && feedback.segments.length > 0 && (
                        <SegmentFeedback segments={feedback.segments} />
                    )}

                    {transcriptSegments ? (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Transcript</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <TranscriptView
                                    segments={transcriptSegments}
                                    repSpeakerNumber={feedback?.rep_speaker_number}
                                />
                            </CardContent>
                        </Card>
                    ) : (
                        conversation.transcript && (
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
                        )
                    )}
                </div>
            </main>
        </>
    )
}
