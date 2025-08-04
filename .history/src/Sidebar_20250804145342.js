import './Sidebar.css';

async function copyTextToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    console.log('Text copied to clipboard successfully!');
  } catch (err) {
    console.error('Failed to copy text: ', err);
  }
}

function Sidebar({ polygons, onSearchChange, onResultClick, searchTerm, onClose }) {

  const filteredPolygons = polygons.filter(polygon =>
    polygon.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleItemClick = (polygonId) => {
    onResultClick(polygonId);
    if (window.innerWidth < 800) {
      if (onClose) {
        onClose();
      }
    }
  };

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
              onClick={() => handleItemClick(polygon.id)}
            >
              <h4>{polygon.name}</h4>
            </li>
          ))
        ) : (
          <p className="no-results">No locations found.</p>
        )}
        <li><button className='btn' style={{ background: "#007bff", width: "100%", borderRadius: 0 }} onClick={() => copyTextToClipboard(localStorage.getItem('niper-mapped-areas'))}>Copy All</button></li>
      </ul>
    </aside>
  );
}

export default Sidebar;