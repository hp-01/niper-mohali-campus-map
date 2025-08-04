import React from 'react';

// Accept the new onCopyData prop
const Sidebar = ({ polygons, searchTerm, onSearchChange, onResultClick, onClose, onCopyData }) => {
  const filteredPolygons = polygons.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="sidebar-header">
        <h2>Campus Locations</h2>
        <button className="close-btn" onClick={onClose} title="Close sidebar">×</button>
      </div>
      <div className="sidebar-controls">
        <input
          type="text"
          placeholder="Search for an area..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {/* The new button to copy data */}
        <button
          className="copy-data-btn"
          onClick={onCopyData}
          title="Copy the raw JSON data of all saved areas to your clipboard."
        >
          Copy Data
        </button>
      </div>
      <ul className="results-list">
        {filteredPolygons.length > 0 ? (
          filteredPolygons.map(polygon => (
            <li key={polygon.id} onClick={() => onResultClick(polygon.id)}>
              {polygon.name}
            </li>
          ))
        ) : (
          <li className="no-results">No locations found.</li>
        )}
      </ul>
    </>
  );
};

export default Sidebar;