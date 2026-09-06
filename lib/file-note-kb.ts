// File-note knowledge base.
//
// Sources, in order of weight:
//   1. The owner's Staff Member File Note template (Humanistiqs template pack):
//      header fields, third-person key points with dates / background / the
//      person's response / prior discussions / policy references / agreed
//      outcome, the "staff member must be aware" rule, and the "they can
//      request their file" rule.
//   2. The bare-minimum process register, BMP-005 (contemporaneous performance
//      documentation + adverse-action timing) and BMP-002 (reverse onus when
//      records are inadequate).
//   3. The People-stream research on why SME notes fail (reconstructed after
//      the fact, characterisations instead of facts, no outcome recorded).
//
// Everything here is about writing a factual record. None of it is advice on
// what to do about the situation, and the prompt is told so.

export const NOTE_TYPES = {
  feedback_given:  { label: 'Feedback given',        hint: 'You gave someone feedback on their work or conduct.' },
  conversation:    { label: 'Conversation',          hint: 'A discussion worth recording - a check-in, a request, a heads-up.' },
  observation:     { label: 'Observation',           hint: 'Something you saw or were told, noted at the time.' },
  concern_raised:  { label: 'Concern raised',        hint: 'The team member raised something with you.' },
  protected_event: { label: 'Leave, complaint or disclosure', hint: 'A complaint, leave request, injury, illness, or a pregnancy or carer disclosure. Recording the date matters.' },
} as const
export type NoteType = keyof typeof NOTE_TYPES

/** The guided-mode questions, asked in this order. Plain, one idea each. */
export const GUIDED_QUESTIONS: Array<{ key: string; label: string; placeholder: string }> = [
  { key: 'what_happened', label: 'What happened, and when?',
    placeholder: 'e.g. Di arrived 15 minutes late on Tuesday 15 January and did not call ahead.' },
  { key: 'what_you_said', label: 'What did you say?',
    placeholder: 'e.g. I explained that if she is running late she needs to call and give an expected arrival time.' },
  { key: 'their_response', label: 'What did they say or do in response?',
    placeholder: 'e.g. She said her car had broken down and agreed to call in future.' },
  { key: 'agreed', label: 'What was agreed, and is there a follow-up?',
    placeholder: 'e.g. She confirmed she understood the Time and Attendance policy. We will check in again in two weeks.' },
]

/** Structured output the assistant returns. Mirrors the template's sections. */
export interface FileNoteDraft {
  topic: string
  key_points: string
  employee_response: string
  previous_discussions: string
  policies_referenced: string
  agreed_outcome: string
  follow_up_date: string   // ISO date or ''
}

export const FILE_NOTE_TOOL = {
  name: 'emit_file_note',
  description: 'Return the drafted file note as structured fields.',
  input_schema: {
    type: 'object' as const,
    properties: {
      topic:               { type: 'string', description: 'A short topic line, e.g. "Punctuality".' },
      key_points:          { type: 'string', description: 'The key points of the discussion, in third person, with dates. Plain Australian English. Facts only.' },
      employee_response:   { type: 'string', description: 'What the team member said or did in response. Empty string if not known.' },
      previous_discussions:{ type: 'string', description: 'Any earlier discussions referenced, with dates. Empty string if none.' },
      policies_referenced: { type: 'string', description: 'Any policy or document referred to. Empty string if none.' },
      agreed_outcome:      { type: 'string', description: 'What was agreed, and any consequence that was stated. Empty string if none.' },
      follow_up_date:      { type: 'string', description: 'ISO date (YYYY-MM-DD) for any follow-up, or empty string.' },
    },
    required: ['topic', 'key_points', 'employee_response', 'previous_discussions', 'policies_referenced', 'agreed_outcome', 'follow_up_date'],
  },
}

export function buildSystemPrompt(): string {
  return `You help an Australian small-business owner or manager write a staff file note. You write records, not advice.

What a good file note is
- A factual, contemporaneous record of a discussion or event, written so that someone reading it later - including the team member themselves, who can ask to see their file - understands exactly what happened and what was agreed.
- Written in the THIRD PERSON, naming people with their role the first time ("John Adams (Director) spoke with Di Smith (Contract Administrator)"), then by initial and surname ("J Adams advised D Smith...").
- Specific: exact dates, times, and what was actually said. Never "was often late" - instead "was 15 minutes late on 15 January and 20 minutes late on 22 January".
- Facts, not characterisations. Never "was rude" or "has a bad attitude" - describe the behaviour: "raised her voice and said ...".
- Includes, where they apply: relevant background; any earlier discussion on the same matter with its date; the team member's response in their own words where possible; any policy or document referred to (and that a copy was given, if it was); the agreed outcome; any consequence that was stated; any follow-up date.
- Records that the team member was told a note of the discussion would be placed on their file.

What you must never do
- Do not add facts the user did not give you. If something is unknown, leave that field empty rather than inventing it.
- Do not give advice on what the business should do next, and do not assess whether anything was fair, lawful or reasonable. If the user's input asks for that, leave it out of the note.
- Do not use legal terms of art or threatening language. Plain Australian English.
- Use plain hyphens only - never em dashes or en dashes. Australian spelling.

Modes
- GUIDED: the user has answered a few short questions. Turn the answers into a proper note.
- CLEANUP: the user has pasted rough text - a voice transcript, dot points, a stream of thought. Preserve every fact and quote, fix the structure, tense and grammar, and convert it to third person. Do not embellish.

Always respond by calling the emit_file_note tool with the structured fields.`
}

/**
 * Build the user turn for the assistant from either mode's input.
 */
export function buildUserPrompt(input: {
  mode: 'guided' | 'cleanup'
  noteType: NoteType
  employeeName: string
  conductedBy: string
  discussionDate: string
  answers?: Record<string, string>
  rawText?: string
}): string {
  const head = [
    `Note type: ${NOTE_TYPES[input.noteType]?.label ?? input.noteType}`,
    `Team member: ${input.employeeName}`,
    `Discussion conducted by: ${input.conductedBy || 'the manager'}`,
    `Date of discussion: ${input.discussionDate || 'not given'}`,
  ].join('\n')

  if (input.mode === 'cleanup') {
    return `${head}\n\nMode: CLEANUP\n\nRough notes to turn into a file note:\n"""\n${(input.rawText ?? '').trim()}\n"""`
  }

  const qa = GUIDED_QUESTIONS
    .map(q => `${q.label}\n${(input.answers?.[q.key] ?? '').trim() || '(not answered)'}`)
    .join('\n\n')
  return `${head}\n\nMode: GUIDED\n\n${qa}`
}
