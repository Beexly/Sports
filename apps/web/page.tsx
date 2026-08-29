import { EVCalculator } from '@/components/intelligence';

export default function IntelligenceDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Sports Intelligence Dashboard
        </h1>
        
        <div className="grid gap-6">
          <div className="col-span-1 lg:col-span-3">
            <EVCalculator className="bg-white rounded-lg shadow p-6" />
          </div>
          
          <div className="col-span-1 lg:col-span-3">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Coming Soon</h2>
              <p className="text-gray-600">
                Additional intelligence components will be added here:
                <br />• CLV Visualizer
                <br />• Prop Advisor  
                <br />• Anytime-Valid Monitor
                <br />• Logit Pool Analyzer
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}