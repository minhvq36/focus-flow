import React from 'react';

/**
 * Search page - Search for users and items
 */
export default function Search() {
  return (
    <div className="search-page">
      <h1>Search</h1>
      <input type="text" placeholder="Search..." />
      <div className="search-results">
        {/* Search results */}
      </div>
    </div>
  );
}
