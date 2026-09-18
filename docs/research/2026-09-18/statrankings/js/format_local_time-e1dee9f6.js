// Shared by local_time_controller.js and relative_time_controller.js: the
// one absolute-date-in-the-viewer's-own-timezone format both eventually fall
// back to, so there's a single place that formatting lives rather than two
// controllers each hand-rolling their own Intl.DateTimeFormat config.
export function formatLocalDateTime(date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}
