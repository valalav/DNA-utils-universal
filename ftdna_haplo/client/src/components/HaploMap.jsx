import React from 'react';

export const HaploMap = ({ data }) => {
  const SVG_WIDTH = 1000;
  const SVG_HEIGHT = 500;

  return (
    <div className="w-full overflow-x-auto">
      <svg 
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="w-full h-auto"
      >
        <path
          d="M150,50 L850,50 L850,450 L150,450 Z"
          fill="#f0f0f0"
          stroke="#ccc"
          strokeWidth="1"
        />
        
        {data && data.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="5"
            fill="#8884d8"
            opacity="0.6"
          />
        ))}
      </svg>
    </div>
  );
};

export const MapLegend = ({ data }) => {
  return (
    <div className="mt-4 grid grid-cols-2 gap-4">
      <div>
        <h4 className="font-medium text-sm mb-2">Distribution</h4>
        <div className="space-y-1">
          {data && Object.entries(data).map(([region, count]) => (
            <div key={region} className="flex justify-between">
              <span>{region}</span>
              <span className="font-medium">{count}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h4 className="font-medium text-sm mb-2">Density</h4>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-opacity-20 bg-blue-500"></div>
          <span>Low</span>
          <div className="w-4 h-4 rounded-full bg-opacity-60 bg-blue-500"></div>
          <span>High</span>
        </div>
      </div>
    </div>
  );
};