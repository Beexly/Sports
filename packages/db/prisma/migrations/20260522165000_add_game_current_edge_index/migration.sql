-- Add public Edge Index readout for every tracked game.
ALTER TABLE "games" ADD COLUMN "currentEdgeIndex" DOUBLE PRECISION;
