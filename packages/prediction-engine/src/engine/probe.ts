import { coachTrailFactors } from "./coach-trail.js";
const x: Parameters<typeof coachTrailFactors>[0] = { homeTeam: "A", awayTeam: "B", week: 1, pickedSide: "HOME", staffAggressionHome: 0.6 };
console.log(x.staffAggressionHome);
