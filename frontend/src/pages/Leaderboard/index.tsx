import React from 'react';
import GlobalBoard from './GlobalBoard';
import FriendsBoard from './FriendsBoard';

/**
 * Leaderboard page - Ranking system
 */
export default function Leaderboard() {
  return (
    <div className="leaderboard-page">
      <h1>Leaderboard</h1>
      <GlobalBoard />
      <FriendsBoard />
    </div>
  );
}
