import React from 'react';

/**
 * ProgressBar component - Generic reusable progress bar
 */
export default function ProgressBar({ current, max }: any) {
  const percentage = (current / max) * 100;
  return (
    <div className="progress-bar">
      <div className="progress-fill" style={{ width: `${percentage}%` }} />
    </div>
  );
}
