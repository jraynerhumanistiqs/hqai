'use client'

// Reviewer Visual Telemetry display (Tier 2).
//
// Renders the per-question + overall in-frame %, at-camera %, and
// face-brightness signals computed in the candidate's browser at
// recording time. Read straight from
// prescreen_responses.visual_diagnostics.
//
// This is DELIBERATELY visually distinct from SpeechAnalysisPanel
// because the data flow is different: visual telemetry never feeds
// the AI scorer (see docs/AIA-visual-telemetry.md) and reviewers
// need to interpret it differently. The badge + colour are tuned to
// say "diagnostic, not score".

import type { PerQuestionVisualDiagnostic, VisualAggregate } from '@/lib/visual-telemetry'
import { rollUp } from '@/lib/visual-telemetry'

interface Props {
  perQuestion: PerQuestionVisualDiagnostic[] | null | undefined
  density?: 'tight' | 'roomy'
}

export function ReviewerDiagnosticsPanel({ perQuestion, density = 'roomy' }: Props) {
  const list = perQuestion ?? []
  if (list.length === 0) return null
  const overall = rollUp(list)
  if (overall.frames_sampled === 0) return null

  return (
    <div className={density === 'tight' ? 'px-3 py-2 border-t border-border bg-blue-50/40' : 'bg-white rounded-2xl border border-blue-200 shadow-card px-4 py-3'}>
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700 flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-600" />
          Reviewer diagnostics
        </p>
        <span className="text-[10px] uppercase font-bold tracking-wider bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
          Diagnostic only
        </span>
      </div>
      {density === 'roomy' && (
        <p className="text-[11px] text-mid leading-snug mb-2.5">
          What the candidate&apos;s camera captured. Computed in their browser; no facial data left the device. <strong className="text-charcoal">Never fed to the AI scorer.</strong>
        </p>
      )}
      <Row label="In frame" value={overall.in_frame_pct} unit="%" tone={overall.in_frame_pct >= 90 ? 'good' : overall.in_frame_pct >= 70 ? 'mid' : 'low'} />
      <Row label="Roughly at camera" value={overall.at_camera_pct} unit="%" tone={overall.at_camera_pct >= 70 ? 'good' : overall.at_camera_pct >= 40 ? 'mid' : 'low'} />
      <Row label="Lighting" value={overall.face_brightness} unit="%" tone={overall.face_brightness >= 40 ? 'good' : 'mid'} />

      {density === 'roomy' && list.length > 1 && (
        <details className="mt-2">
          <summary className="text-[10px] font-bold uppercase tracking-widest text-mid cursor-pointer hover:text-charcoal">Per question</summary>
          <table className="w-full text-xs mt-1.5">
            <thead className="text-[10px] uppercase tracking-wider text-muted">
              <tr>
                <th className="text-left py-1">Q</th>
                <th className="text-right py-1">In frame</th>
                <th className="text-right py-1">At camera</th>
                <th className="text-right py-1">Lighting</th>
                <th className="text-right py-1">Samples</th>
              </tr>
            </thead>
            <tbody>
              {list.map(d => (
                <tr key={d.q} className="text-charcoal">
                  <td className="py-1">Q{d.q}</td>
                  <td className="text-right py-1">{d.in_frame_pct}%</td>
                  <td className="text-right py-1">{d.at_camera_pct}%</td>
                  <td className="text-right py-1">{d.face_brightness}%</td>
                  <td className="text-right py-1">{d.frames_sampled}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      <p className="text-[10px] text-mid italic mt-2 leading-snug">
        Cultural eye-contact norms, disabilities, low light, and slow connections can all push these numbers around. Treat as supporting context, not as a score.
      </p>
    </div>
  )
}

function Row({ label, value, unit, tone }: { label: string; value: number; unit: string; tone: 'good' | 'mid' | 'low' }) {
  const colour = tone === 'good' ? 'bg-success' : tone === 'mid' ? 'bg-warning' : 'bg-danger'
  return (
    <div className="flex items-center gap-2.5 py-0.5">
      <div className={`w-1 h-5 rounded-full ${colour}`} />
      <p className="text-xs text-mid flex-1 truncate">{label}</p>
      <p className="text-xs font-bold text-charcoal whitespace-nowrap">{value}{unit}</p>
    </div>
  )
}

export type { VisualAggregate, PerQuestionVisualDiagnostic }
