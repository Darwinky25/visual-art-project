import React from 'react';
import { AudioMetrics } from '../types';

export const AudioMonitor: React.FC<{ metrics: AudioMetrics }> = ({ metrics }) => {
  const bars = [
    { label: 'BASS', value: metrics.bass, color: '#ff4444' },
    { label: 'MID', value: metrics.mids, color: '#ffcc00' },
    { label: 'HIGH', value: metrics.highs, color: '#32cd32' },
    { label: 'TRBL', value: metrics.treble, color: '#3b82f6' },
    { label: 'NRGY', value: metrics.energy, color: '#a855f7' },
  ];

  return (
    <div style={{ background: '#111', padding: '12px', borderRadius: '6px', border: '1px solid #333' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <strong style={{ opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.65rem', color: '#fff' }}>AUDIO SPEEDOMETER</strong>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.65rem', color: '#888' }}>KICK</span>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: metrics.bassHit ? '#ff4444' : '#222', transition: 'background 0.1s', boxShadow: metrics.bassHit ? '0 0 8px #ff4444' : 'none' }}></div>
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {bars.map(bar => (
          <div key={bar.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '35px', fontSize: '0.6rem', color: '#888', fontWeight: 'bold' }}>{bar.label}</span>
            <div style={{ flex: 1, height: '10px', background: '#222', borderRadius: '3px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  height: '100%', 
                  width: `${Math.min(100, Math.max(0, bar.value * 100))}%`, 
                  background: bar.color,
                  transition: 'width 0.1s linear'
                }} 
              />
            </div>
            <span style={{ width: '30px', textAlign: 'right', fontSize: '0.6rem', color: '#888', fontFamily: 'monospace' }}>
              {(bar.value * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
