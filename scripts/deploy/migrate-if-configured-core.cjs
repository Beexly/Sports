function isTransientDbError(text) {
  if (!text) return false;
  const transientSignals = [
    "P1001",
    "Can't reach database server",
    "database server is running",
    "ETIMEDOUT",
    "ECONNREFUSED",
    "ECONNRESET",
    "EAI_AGAIN",
    "Connection terminated",
    "connection closed",
    "timed out",
    "Timed out fetching a new connection",
  ];
  const haystack = text.toLowerCase();
  return transientSignals.some((signal) => haystack.includes(signal.toLowerCase()));
}

function backoffMs(attempt) {
  const schedule = [5000, 10000, 20000];
  return schedule[Math.min(attempt - 1, schedule.length - 1)];
}

const MAX_MIGRATE_ATTEMPTS = 4;

module.exports = { isTransientDbError, backoffMs, MAX_MIGRATE_ATTEMPTS };
