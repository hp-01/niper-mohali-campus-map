import React from 'react';
import './Sidebar.css'; // We'll keep the internal styles here

// Add 'onClose' prop
function Sidebar({ polygons, onSearchChange, onResultClick, searchTerm, onClose }) {
  
  const filteredPolygons = polygons.filter(polygon =>
    polygon.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleItemClick = (polygonId) => {
    onResultClick(polygonId);
    // If an onClose function is provided, call it. This is for mobile.
    if (onClose) {
      onClose();
    }
  };

  return (
    // The 'open' class will be controlled by App.js
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
              // Use the new handler
              onClick={() => handleItemClick(polygon.id)}
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