import React from 'react';
import ItemCard from './ItemCard';
import SellPanel from './SellPanel';

/**
 * Shop page - Buy and sell garden items
 */
export default function Shop() {
  return (
    <div className="shop-page">
      <h1>Shop</h1>
      <ItemCard />
      <SellPanel />
    </div>
  );
}
