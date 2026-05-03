import { CheckCircle2, ListChecks, Sparkles, TriangleAlert } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Feedback } from '@/lib/ai/feedback-schema'

function scoreTone(score: number) {
    if (score >= 8) return 'text-emerald-600 dark:text-emerald-400'
    if (score >= 5) return 'text-amber-600 dark:text-amber-400'
    return 'text-rose-600 dark:text-rose-400'
}

export function FeedbackView({ feedback }: { feedback: Feedback }) {
    return (
        <div className="grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3">
                <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                    <div className="flex items-center gap-2">
                        <Sparkles className="text-primary size-4" />
                        <CardTitle className="text-base">Coach summary</CardTitle>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className={cn('text-3xl font-semibold tabular-nums', scoreTone(feedback.overall_score))}>
                            {feedback.overall_score.toFixed(1)}
                        </span>
                        <span className="text-muted-foreground text-xs">/ 10</span>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm leading-relaxed">{feedback.summary}</p>
                </CardContent>
            </Card>

            <Card className="lg:col-span-2">
                <CardHeader className="flex-row items-center gap-2 space-y-0">
                    <ListChecks className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <CardTitle className="text-base">Next steps</CardTitle>
                </CardHeader>
                <CardContent>
                    {feedback.next_steps.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No specific next steps suggested.</p>
                    ) : (
                        <ol className="flex flex-col gap-2 text-sm">
                            {feedback.next_steps.map((step, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="bg-muted text-muted-foreground mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium tabular-nums">
                                        {i + 1}
                                    </span>
                                    <span className="leading-relaxed">{step}</span>
                                </li>
                            ))}
                        </ol>
                    )}
                </CardContent>
            </Card>

            <Card className="lg:col-span-5">
                <CardHeader className="flex-row items-center gap-2 space-y-0">
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <CardTitle className="text-base">What went well</CardTitle>
                </CardHeader>
                <CardContent>
                    {feedback.strengths.length === 0 ? (
                        <p className="text-muted-foreground text-sm">Nothing notable to highlight here.</p>
                    ) : (
                        <ul className="flex flex-col gap-4">
                            {feedback.strengths.map((s, i) => (
                                <li key={i} className="flex flex-col gap-1.5">
                                    <p className="text-sm font-medium">{s.point}</p>
                                    <p className="text-muted-foreground border-muted border-l-2 pl-3 text-sm italic">
                                        {s.evidence}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>

            <Card className="lg:col-span-5">
                <CardHeader className="flex-row items-center gap-2 space-y-0">
                    <TriangleAlert className="size-4 text-amber-600 dark:text-amber-400" />
                    <CardTitle className="text-base">Where to improve</CardTitle>
                </CardHeader>
                <CardContent>
                    {feedback.improvements.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No improvement areas flagged.</p>
                    ) : (
                        <ul className="flex flex-col gap-5">
                            {feedback.improvements.map((imp, i) => (
                                <li key={i} className="flex flex-col gap-2">
                                    <p className="text-sm font-medium">{imp.point}</p>
                                    <p className="text-muted-foreground border-muted border-l-2 pl-3 text-sm italic">
                                        {imp.evidence}
                                    </p>
                                    <p className="text-sm">
                                        <span className="text-muted-foreground font-medium">Try: </span>
                                        {imp.suggestion}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
