import React from 'react';
import FriendsList from './FriendsList';
import ActivityFeed from './ActivityFeed';

/**
 * Social page - Friends and activity management
 */
export default function Social() {
  return (
    <div className="social-page">
      <h1>Social</h1>
      <FriendsList />
      <ActivityFeed />
    </div>
  );
}
