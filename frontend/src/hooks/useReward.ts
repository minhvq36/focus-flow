import { useState } from 'react';

/**
 * useReward hook - Reward and penalty effects management
 */
export function useReward() {
  const [rewardData, setRewardData] = useState(null);

  return {
    rewardData,
    setRewardData,
  };
}
