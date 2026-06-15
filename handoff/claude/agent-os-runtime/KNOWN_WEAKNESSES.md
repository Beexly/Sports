# Known Weaknesses

- Task persistence uses existing `CockpitTask` payload storage when DB exists and in-memory fallback in stub mode; deeper first-class Prisma fields can be reviewed later.
- BullMQ facade is safe/manual when Redis is absent; no real worker process was started.
- Jarvis runtime is library-wired, not yet rendered into the cockpit UI.
- Memory is candidate/review runtime only; no new DB schema was added.
- CLV helpers are not yet wired to odds ingestion persistence.
- Calibration helpers are not yet wired to canonical settled-pick queries.
