import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface CLVDataPoint {
  date: string;
  clvValue: number;
  clvKind: 'PROBABILITY' | 'POINTS';
  clvVerdict: 'BEAT_CLOSE' | 'LOST_TO_CLOSE' | 'MATCHED_CLOSE';
  outcome: 'WIN' | 'LOSS' | 'PUSH' | 'VOID';
}

interface CLVVisualizerProps {
  className?: string;
  data?: CLVDataPoint[]; // If not provided, will use mock data
}

export const CLVVisualizer: React.FC<CLVVisualizerProps> = ({ className, data }) => {
  const [clvData, setClvData] = useState<CLVDataPoint[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  // Mock data generation for demonstration
  useEffect(() => {
    if (!data || data.length === 0) {
      // Generate mock CLV data
      const mockData: CLVDataPoint[] = [];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);
      
      for (let i = 0; i < 50; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i * 2);
        
        const clvValue = (Math.random() - 0.5) * 2; // -1 to +1
        const clvKind = Math.random() > 0.5 ? 'PROBABILITY' : 'POINTS';
        const clvVerdict = clvValue > 0.05 ? 'BEAT_CLOSE' : 
                          clvValue < -0.05 ? 'LOST_TO_CLOSE' : 'MATCHED_CLOSE';
        const outcome = Math.random() > 0.5 ? 'WIN' : 'LOSS';
        
        mockData.push({
          date: format(date, 'yyyy-MM-dd'),
          clvValue,
          clvKind,
          clvVerdict,
          outcome
        });
      }
      
      setClvData(mockData);
    } else {
      setClvData(data);
    }
  }, [data]);

  // Filter data based on time range
  const filteredData = useMemo(() => {
    if (timeRange === 'all') return clvData;
    
    const now = new Date();
    let cutoffDate: Date;
    
    switch (timeRange) {
      case '7d':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    return clvData.filter(point => new Date(point.date) >= cutoffDate);
  }, [clvData, timeRange]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        meanCLV: 0,
        medianCLV: 0,
        clvHitRate: 0,
        totalBets: 0,
        sharpMoneyRatio: 0
      };
    }
    
    const clvValues = filteredData.map(d => d.clvValue);
    const sorted = [...clvValues].sort((a, b) => a - b);
    const mean = clvValues.reduce((sum, val) => sum + val, 0) / clvValues.length;
    const median = sorted.length % 2 === 0 ?
      (sorted[sorted.length/2 - 1] + sorted[sorted.length/2]) / 2 :
      sorted[Math.floor(sorted.length/2)];
    const hitRate = filteredData.filter(d => d.clvValue > 0).length / filteredData.length;
    
    // Sharp money ratio: percentage of CLV from top 20% of bets by |CLV|
    const absClvValues = [...clvValues].map(Math.abs).sort((a, b) => b - a);
    const top20Count = Math.max(1, Math.floor(absClvValues.length * 0.2));
    const top20Sum = absClvValues.slice(0, top20Count).reduce((sum, val) => sum + val, 0);
    const totalSum = absClvValues.reduce((sum, val) => sum + val, 0);
    const sharpMoneyRatio = totalSum > 0 ? top20Sum / totalSum : 0;
    
    return {
      meanCLV: mean,
      medianCLV: median,
      clvHitRate: hitRate,
      totalBets: filteredData.length,
      sharpMoneyRatio
    };
  }, [filteredData]);

  return (
    <div className={className}>
      <h2 className="text-xl font-bold mb-4">Closing Line Value (CLV) Visualizer</h2>
      
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Time Range:</span>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-1"
            >
              <option value="7d">7 Days</option>
              <option value="30d">30 Days</option>
              <option value="90d">90 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
          
          <div className="flex-1 flex justify-end">
            <button
              onClick={() => {
                // In real app, this would fetch fresh data
                alert('Refreshing data from server...');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Mean CLV</h3>
          <p className="text-2xl font-bold {stats.meanCLV > 0 ? 'text-green-600' : 'text-red-600'}">
            {stats.meanCLV.toFixed(3)}
          </p>
          <p className="text-xs text-gray-500">Average edge vs. closing line</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Median CLV</h3>
          <p className="text-2xl font-bold {stats.medianCLV > 0 ? 'text-green-600' : 'text-red-600'}">
            {stats.medianCLV.toFixed(3)}
          </p>
          <p className="text-xs text-gray-500">Typical bet value</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">CLV Hit Rate</h3>
          <p className="text-2xl font-bold text-green-600">
            {(stats.clvHitRate * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500">Percentage of +CLV bets</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Total Bets</h3>
          <p className="text-2xl font-bold text-blue-600">
            {stats.totalBets}
          </p>
          <p className="text-xs text-gray-500">Sample size</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Sharp Money Ratio</h3>
          <p className="text-2xl font-bold text-purple-600">
            {(stats.sharpMoneyRatio * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500">Top 20% contribution</p>
        </div>
      </div>

      {/* CLV Distribution Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-bold mb-4">CLV Distribution</h3>
        <div className="relative h-64">
          {/* In a real app, this would be a proper chart library like Chart.js or Recharts */}
          <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-500/20" 
               style={{ left: '50%', transform: 'translateX(-50%)', width: '80%', height: '4px' }}></div>
          
          {/* Positive CLV area */}
          <div className="absolute inset-0 bg-green-500/20" 
               style={{ left: '50%', width: '40%', height: '100%', transformOrigin: 'left' }}></div>
          
          {/* Negative CLV area */}
          <div className="absolute inset-0 bg-red-500/20" 
               style={{ left: '50%', width: '40%', height: '100%', transformOrigin: 'right' }}></div>
          
          {/* CLV markers */}
          {filteredData.map((point, index) => (
            <div key={index} 
                 className="absolute w-2 h-2 rounded-full"
                 style={{
                   left: `calc(50% + ${point.clvValue * 20}%)`,
                   top: '50%',
                   transform: 'translate(-50%, -50%)',
                   backgroundColor: point.clvValue > 0 ? '#10b981' : '#ef4444',
                   border: point.clvKind === 'PROBABILITY' ? '2px solid currentColor' : '1px dashed currentColor',
                   opacity: point.outcome === 'WIN' ? 0.8 : 0.5
                 }}
                 title={`${point.date}: ${point.clvValue > 0 ? '+' : ''}${point.clvValue.toFixed(3)} ${point.clvKind} (${point.outcome})`}
            />
          ))}
          
          {/* Zero line */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 h-full w-px bg-gray-300" />
          
          {/* Labels */}
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 text-xs text-gray-500">
            0 (Closing Line)
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Green = +CLV (beat closing line), Red = -CLV (lost to closing line)<br/>
          Solid = Probability CLV, Dashed = Points CLV<br/>
          Brighter = Win, Dimmer = Loss/Push
        </p>
      </div>

      {/* CLV Trends Over Time */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">CLV Trends Over Time</h3>
        <div className="relative h-48">
          {/* Trend line (simplified) */}
          <div className="absolute inset-0 bg-blue-500/20" 
               style={{ 
                 left: '0%', 
                 width: '100%', 
                 height: '100%', 
                 backgroundImage: 'linear-gradient(to right, transparent, blue-500/20)',
                 pointerEvents: 'none'
               }}></div>
          
          {/* Data points over time */}
          {filteredData.map((point, index) => (
            <div key={index} 
                 className="absolute w-3 h-3 rounded-full"
                 style={{
                   left: `calc(${index / (filteredData.length - 1 || 1) * 100}%)`,
                   bottom: `calc(50% + ${point.clvValue * 40}%)`,
                   transform: 'translate(-50%, -50%)',
                   backgroundColor: point.clvVerdict === 'BEAT_CLOSE' ? '#10b981' : 
                                 point.clvVerdict === 'LOST_TO_CLOSE' ? '#ef4444' : '#fbbf24',
                   border: '1px solid white',
                   boxShadow: '0 0 0 2px rgba(0,0,0,0.2)'
                 }}
                 title={`${point.date}: ${point.clvValue.toFixed(3)} ${point.clvKind} (${point.clvVerdict})`}
            />
          ))}
          
          {/* Horizontal zero line */}
          <div className="absolute left-0 right-0 bottom-1/2 h-px bg-gray-300" />
          
          {/* Vertical date markers */}
          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, idx) => (
            <div key={idx} 
                 className="absolute left-0 -translate-x-1/2 bottom-0 -mb-1"
                 style={{
                   left: `calc(${idx / 11 * 100}%)`,
                   fontSize: '0.75rem',
                   color: '#6b7280'
                 }}>
              {month}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Shows CLV trajectory over time. Green=BEAT_CLOSE, Red=LOST_TO_CLOSE, Yellow=MATCHED_CLOSE
        </p>
      </div>
    </div>
  );
};