# Memory Candidate Runtime

Implemented typed memory candidates and review queue under `apps/web/lib/memory`.

## Behavior

- Candidates are never approved automatically.
- Sensitive candidates require owner review.
- Rejected memory is excluded from summaries.
- Approved memory can be summarized.
- ARCHIVE remains the owning agent concept; no external vector store is called.
