import React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

export const MetricsCard = ({ title, value, change, icon: Icon }) => {
  const isPositive = change > 0;
  
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-600">{title}</h3>
        <Icon className="w-5 h-5 text-blue-500" />
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
      {change && (
        <div className={`flex items-center mt-2 text-sm
          ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          <span>{isPositive ? '↑' : '↓'} {Math.abs(change)}%</span>
          <span className="ml-1 text-gray-500">vs previous</span>
        </div>
      )}
    </div>
  );
};

export const ModelVersionCard = ({ version, metrics, onRollback }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium">Version {version}</h4>
        <button
          onClick={() => onRollback(version)}
          className="text-sm text-blue-600 hover:text-blue-800">
          Rollback
        </button>
      </div>
      <div className="space-y-2">
        {Object.entries(metrics).map(([key, value]) => (
          <div key={key} className="flex justify-between text-sm">
            <span className="text-gray-600">{key}:</span>
            <span className="font-medium">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const PredictionDistribution = ({ data }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="font-medium mb-4">Prediction Distribution</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const AlertsList = ({ alerts, onDismiss }) => {
  return (
    <div className="space-y-4">
      {alerts.map((alert, index) => (
        <div 
          key={index} 
          className={`p-3 rounded-lg flex items-center justify-between
            ${alert.severity === 'high' ? 'bg-red-50' : 
              alert.severity === 'medium' ? 'bg-yellow-50' : 
              'bg-blue-50'}`}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" />
            <div>
              <p className="font-medium">{alert.alert_type}</p>
              <p className="text-sm">{alert.description}</p>
            </div>
          </div>
          <button
            onClick={() => onDismiss(alert.id)}
            className="text-gray-500 hover:text-gray-700">
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export const LogsTable = ({ logs }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Timestamp
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Level
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Message
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {logs.map((log, index) => (
            <tr key={index}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(log.timestamp).toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 text-xs font-medium rounded-full
                  ${log.level === 'ERROR' ? 'bg-red-100 text-red-800' :
                    log.level === 'WARNING' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'}`}>
                  {log.level}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-900">
                {log.message}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
