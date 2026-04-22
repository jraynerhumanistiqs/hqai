// HQ Recruit - anonymisation helper shared by RoleDetail and CompareView.
// Produces stable alpha labels (Candidate A, Candidate B, ...) based on
// submission order. When called from a comparison view where a fixed ordering
// of ids is passed, the output is deterministic for that set.

function alphaLabel(i: number): string {
  let n = i
  let out = ''
  do {
    out = String.fromCharCode(65 + (n % 26)) + out
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return out
}

export interface AnonSibling {
  id: string
  created_at: string
}

/**
 * Returns the anon display label for responseId, computed by sorting the
 * provided siblings by created_at ascending. Falls back to "Candidate ?" if
 * the id is not in siblings.
 */
export function getAnonLabel(
  responseId: string,
  siblings: Array<AnonSibling>,
): string {
  const sorted = [...siblings].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
  const i = sorted.findIndex(s => s.id === responseId)
  if (i < 0) return 'Candidate ?'
  return `Candidate ${alphaLabel(i)}`
}

/** Build a full mapping responseId -> "Candidate X" for all siblings. */
export function buildAnonMap(siblings: Array<AnonSibling>): Record<string, string> {
  const sorted = [...siblings].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
  const map: Record<string, string> = {}
  sorted.forEach((s, i) => { map[s.id] = `Candidate ${alphaLabel(i)}` })
  return map
}
