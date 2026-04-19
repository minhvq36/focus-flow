import React from 'react';
import TaskList from './TaskList';
import QuotaBadge from './QuotaBadge';
import MiniGarden from './MiniGarden';

/**
 * Dashboard page - Main landing page showing tasks and mini garden
 */
export default function Dashboard() {
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <QuotaBadge />
      </div>
      <div className="dashboard-content">
        <TaskList />
        <MiniGarden />
      </div>
    </div>
  );
}
