import React from 'react';
import ListingCard from './ListingCard';
import PriceHistory from './PriceHistory';

/**
 * Marketplace page - Player-to-player trading
 */
export default function Marketplace() {
  return (
    <div className="marketplace-page">
      <h1>Marketplace</h1>
      <ListingCard />
      <PriceHistory />
    </div>
  );
}
