import React from 'react';
import GardenCanvas from './GardenCanvas';
import InventoryPanel from './InventoryPanel';
import LevelProgress from './LevelProgress';

/**
 * Garden page - Main garden customization and item placement
 */
export default function Garden() {
  return (
    <div className="garden-page">
      <GardenCanvas />
      <InventoryPanel />
      <LevelProgress />
    </div>
  );
}
