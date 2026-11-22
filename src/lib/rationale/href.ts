/** Internal link to the readable rationale page (safe for client components). */
export function rationaleHref(drepId: string, proposalId: string): string {
  return `/rationale?drep=${encodeURIComponent(drepId)}&proposal=${encodeURIComponent(proposalId)}`;
}
