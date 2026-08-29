import React, { useState } from 'react';
import { brierScore } from '@/lib/calibration/brier';
import { anytimeValidLedger } from '@sports/prediction-engine';
import { calculateEV, kellyFraction } from '@/lib/fantasy/props';

interface EVCalculatorProps {
  className?: string;
}

export const EVCalculator: React.FC<EVCalculatorProps> = ({ className }) => {
  const [probability, setProbability] = useState(0.5);
  const [odds, setOdds] = useState(2.0);
  const [stake, setStake] = useState(100);
  const [returns, setReturns] = useState<number[]>([]);
  const [anytimeResult, setAnytimeResult] = useState<any | null>(null);

  const calculate = () => {
    const decimalOdds = odds;
    const ev = calculateEV(probability, decimalOdds);
    const kelly = kellyFraction(probability, decimalOdds);
    const recommendedStake = Math.max(0, kelly * stake * 0.5); // Half-Kelly
    
    // Update returns sequence for anytime-valid processing
    const newReturns = [...returns];
    // Simulate a bet outcome based on probability
    const outcome = Math.random() < probability ? (decimalOdds - 1) : -1;
    newReturns.push(outcome);
    
    // Keep only last 100 returns for performance
    if (newReturns.length > 100) newReturns.shift();
    setReturns(newReturns);
    
    // Calculate anytime-valid evidence
    if (newReturns.length >= 1) {
      const anytime = anytimeValidLedger(newReturns, { range: 20 });
      setAnytimeResult({
        logEValue: anytime.current.logEValue,
        everSignificant: anytime.everRejected,
        firstSignificantAtN: anytime.firstRejectedAt,
        lowerBound: anytime.lowerBound,
        upperBound: anytime.upperBound
      });
    }
  };

  const reset = () => {
    setProbability(0.5);
    setOdds(2.0);
    setStake(100);
    setReturns([]);
    setAnytimeResult(null);
  };

  return (
    <div className={className}>
      <h2>Expected Value Calculator</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Inputs */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Win Probability (%)</label>
            <input
              type="number"
              value={probability * 100}
              onChange={(e) => setProbability(Math.max(0, Math.min(1, parseFloat(e.target.value) / 100)))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              max="100"
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Decimal Odds</label>
            <input
              type="number"
              value={odds}
              onChange={(e) => setOdds(Math.max(1.01, parseFloat(e.target.value)))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Bankroll ($)</label>
            <input
              type="number"
              value={stake}
              onChange={(e) => setStake(Math.max(0, parseFloat(e.target.value)))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="1"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={calculate}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Calculate EV
            </button>
            <button
              onClick={reset}
              className="ml-2 px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="font-semibold mb-2">Expected Value</h3>
            <p className="text-2xl font-bold {ev > 0 ? 'text-green-600' : 'text-red-600'}">
              {ev.toFixed(4)} ({ev * 100}% edge)
            </p>
            <p className="text-sm text-gray-600">
              Per $1 staked: {ev > 0 ? 'Profitable' : 'Unprofitable'} in long run
            </p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="font-semibold mb-2">Kelly Stake</h3>
            <p className="text-2xl font-bold">${recommendedStake.toFixed(2)}</p>
            <p className="text-sm text-gray-600">
              Recommended bet ({(kelly * 100).toFixed(1)}% Kelly)
            </p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="font-semibold mb-2">Win/Loss Outcomes</h3>
            <p className="text-2xl font-bold">
              Win: {(probability * 100).toFixed(1)}% | Loss: {((1 - probability) * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600">
              Based on {returns.length} simulated bets
            </p>
          </div>
        </div>

        {/* Anytime-Valid Evidence */}
        <div className="col-span-2 md:col-span-1 lg:col-span-1">
          {anytimeResult ? (
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="font-semibold mb-2">Sequential Validation (Anytime-Valid)</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Log E-Value:</span>
                  <span className="font-mono">{anytimeResult.logEValue.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Ever Significant:</span>
                  <span className="{anytimeResult.everSignificant ? 'text-green-600' : 'text-gray-600'}">
                    {anytimeResult.everSignificant ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ms">First Significant at N:</span>
                  <span className="font-mono">
                    {anytimeResult.firstSignificantAtN !== null ? anytimeResult.firstSignificantAtN.toString() : 'Not yet'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Confidence Bounds:</span>
                  <span className="font-mono">
                    [{anytimeResult.lowerBound.toFixed(3)}, {anytimeResult.upperBound.toFixed(3)}]
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Sequential validation with range=20 units. Green indicates statistically significant
                  deviation from expected performance (alpha=0.05).
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded-md text-center py-8">
              <h3 className="font-semibold mb-2">Sequential Validation</h3>
              <p className="text-gray-500">Place bets to see anytime-valid evidence</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Returns History */}
      <div className="mt-6">
        <h3 className="font-semibold mb-4">Returns History (Last 20)</h3>
        {returns.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No bets placed yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Bet #</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Outcome</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Cumulative Return</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {returns.slice(-20).map((ret, idx) => {
                  const betNum = returns.length - 20 + idx + 1;
                  const cumulative = returns.slice(0, betNum).reduce((sum, r) => sum + r, 0);
                  const isWin = ret > 0;
                  return (
                    <tr key={betNum} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm font-mono">{betNum}</td>
                      <td className="px-4 py-2 text-sm font-mono {isWin ? 'text-green-600' : 'text-red-600'}">
                        {ret > 0 ? `+${ret.toFixed(2)}` : ret.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-sm font-mono {cumulative >= 0 ? 'text-green-600' : 'text-red-600'}">
                        {cumulative.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};