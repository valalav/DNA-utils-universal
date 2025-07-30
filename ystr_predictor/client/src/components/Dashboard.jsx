import React, { useState, useEffect } from 'react';
import { LineChart, XAxis, YAxis, CartesianGrid, Line, Tooltip } from 'recharts';
import { AlertTriangle, Check, BarChart, Activity } from 'lucide-react';

const Dashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1d');

  useEffect(() => {
    fetchMetrics();
    fetchAlerts();
    fetchLogs();
    fetchModels();

    const interval = setInterval(fetchMetrics, 60000);
    return () => clearInterval(interval);
  }, [selectedTimeframe]);

  const fetchMetrics = async () => {
    try {
      const response = await fetch(`/api/model/metrics?window=${selectedTimeframe}`);
      setMetrics(await response.json());
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  };

  // Основной dashboard
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <header className="bg-white shadow rounded-lg p-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Model Monitoring Dashboard</h1>
      </header>

      {/* Метрики в реальном времени */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-600">Accuracy</h3>
            <Activity className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold mt-2">
            {metrics?.accuracy ? (metrics.accuracy * 100).toFixed(2) + '%' : 'N/A'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-600">Average Latency</h3>
            <Activity className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold mt-2">
            {metrics?.avg_latency ? metrics.avg_latency.toFixed(2) + 'ms' : 'N/A'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-600">Predictions</h3>
            <BarChart className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold mt-2">
            {metrics?.prediction_count?.toLocaleString() || 'N/A'}
          </p>
        </div>
      </div>

      {/* График производительности */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-medium mb-4">Performance Metrics</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metrics?.time_series || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="accuracy" stroke="#3b82f6" />
              <Line type="monotone" dataKey="f1" stroke="#10b981" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Алерты и логи */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-medium mb-4">Recent Alerts</h2>
          <div className="space-y-4">
            {alerts.map((alert, index) => (
              <div key={index} className={`p-3 rounded-lg flex items-center gap-3 
                ${alert.severity === 'high' ? 'bg-red-50 text-red-700' : 
                  alert.severity === 'medium' ? 'bg-yellow-50 text-yellow-700' : 
                  'bg-blue-50 text-blue-700'}`}>
                <AlertTriangle className="w-5 h-5" />
                <div>
                  <p className="font-medium">{alert.alert_type}</p>
                  <p className="text-sm">{alert.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-medium mb-4">System Logs</h2>
          <div className="space-y-2">
            {logs.map((log, index) => (
              <div key={index} className="text-sm border-b pb-2">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-full text-xs
                    ${log.level === 'ERROR' ? 'bg-red-100 text-red-800' :
                      log.level === 'WARNING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'}`}>
                    {log.level}
                  </span>
                  <span className="text-gray-500">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                <p className="mt-1">{log.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Модальное окно для переобучения */}
      {retrainingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Retrain Model</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Dataset Path</label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  value={retrainingConfig.datasetPath}
                  onChange={e => setRetrainingConfig({
                    ...retrainingConfig,
                    datasetPath: e.target.value
                  })}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  className="px-4 py-2 text-gray-600 rounded hover:bg-gray-100"
                  onClick={() => setRetrainingModal(false)}>
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  onClick={handleRetrain}>
                  Start Retraining
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
