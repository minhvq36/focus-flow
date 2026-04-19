import React from 'react';
import Confetti from './Confetti';

/**
 * RewardModal component - Display reward after completing task
 */
export default function RewardModal() {
  return (
    <div className="reward-modal">
      <Confetti />
      <h2>Reward!</h2>
      <p>You earned: 100 coins</p>
    </div>
  );
}
