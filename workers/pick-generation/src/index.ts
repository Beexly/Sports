/**
 * Pick Generation Worker
 *
 * Pick generation runs as part of the data-refresh worker cycle
 * (workers/data-refresh) after every odds ingestion. Each refresh
 * cycle calls scoreGames() and writes/updates picks to the database.
 *
 * This dedicated worker is reserved for future standalone pick
 * re-scoring (e.g. triggered by line movement alerts, on-demand
 * admin scoring runs, or BullMQ job scheduling).
 *
 * For now it exits immediately to avoid confusing failures when
 * invoked by the `workers:picks` npm script.
 */

console.log("[pick-generation] Pick generation is integrated into the data-refresh worker.");
console.log("[pick-generation] Start workers/data-refresh instead: npm run workers:refresh");
process.exit(0);
