import React from 'react';

/**
 * ItemCard component - Display shop item for purchase
 */
export default function ItemCard() {
  return (
    <div className="item-card">
      <div className="item-image" />
      <div className="item-info">
        <h4>Item Name</h4>
        <p>Price: 100 coins</p>
        <button>Buy</button>
      </div>
    </div>
  );
}
