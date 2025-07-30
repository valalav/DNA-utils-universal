'use client';

import React from 'react';

interface SchemePreviewProps {
  scheme: any;
}

export const SchemePreview: React.FC<SchemePreviewProps> = ({ scheme }) => {
  const sampleMarkers = [
    { value: '13', type: 'normal' },
    { value: '14', type: 'rare', rarity: 1 },
    { value: '15', type: 'rare', rarity: 3 },
    { value: '+2', type: 'diff', diff: 2 }
  ];

  return (
    <div className="p-2 border rounded bg-background-primary shadow-sm">
      <table className="text-xs w-full">
        <tbody>
          <tr>
            {sampleMarkers.map((marker, idx) => (
              <td 
                key={idx}
                className="text-center p-1 border"
                style={{
                  backgroundColor: marker.type === 'rare' 
                    ? scheme.colors[`rarity-${marker.rarity}`]
                    : 'transparent',
                  color: marker.type === 'diff'
                    ? scheme.colors[`diff-${marker.diff}`]
                    : 'inherit'
                }}
              >
                {marker.value}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};