import React from 'react';
import './Sidebar.css';

function Sidebar({ polygons, onSearchChange, onResultClick, searchTerm }) {
  
  // Filter the polygons based on the search term
  const filteredPolygons = polygons.filter(polygon =>
    polygon.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <input
          type="text"
          placeholder="Search for a location..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <ul className="results-list">
        {filteredPolygons.length > 0 ? (
          filteredPolygons.map(polygon => (
            <li
              key={polygon.id}
              className="result-item"
              onClick={() => onResultClick(polygon.id)}
            >
              <h4>{polygon.name}</h4>
            </li>
          ))
        ) : (
          <p className="no-results">No locations found.</p>
        )}
      </ul>
    </aside>
  );
}

export default Sidebar;