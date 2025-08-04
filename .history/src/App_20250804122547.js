import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Polygon, DrawingManager, InfoWindow } from '@react-google-maps/api';
import Sidebar from './Sidebar'; // NEW: Import the Sidebar component
import defaultAreas from './niper-areas.json';
import './App.css';

// --- Configuration ---
const NIPER_SEARCH_QUERY = "NIPER, Sector 67, Mohali";
const FALLBACK_COORDS = { lat: 30.74233, lng: 76.73385 };
const NIPER_MOHALI_ADDRESS = "National Institute of Pharmaceutical Education and Research (NIPER), Sector 67, Sahibzada Ajit Singh Nagar, Punjab 160062";
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };
const MAP_LIBRARIES = ['drawing', 'places'];

// NEW: Define a set of colors for the polygons
const POLYGON_COLORS = [
  '#1E90FF', // DodgerBlue
  '#32CD32', // LimeGreen
  '#FF7F50', // Coral
  '#9370DB', // MediumPurple
  '#FFD700', // Gold
];

function App() {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [polygons, setPolygons] = useState([]);
  const [activePolygonId, setActivePolygonId] = useState(null);
  const [map, setMap] = useState(null);
  const [mapCenter, setMapCenter] = useState(FALLBACK_COORDS);
  const [searchTerm, setSearchTerm] = useState(''); // NEW: State for search term

  // Load polygons from localStorage or default JSON
  useEffect(() => {
    const savedPolygons = localStorage.getItem('niper-mapped-areas');
    if (savedPolygons) {
      setPolygons(JSON.parse(savedPolygons));
    } else {
      setPolygons(defaultAreas);
    }
  }, []);

  // Center map using Places Search
  useEffect(() => {
    if (!map) return;
    const service = new window.google.maps.places.PlacesService(map);
    service.textSearch({ query: NIPER_SEARCH_QUERY }, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results?.[0]) {
        const location = results[0].geometry.location;
        const newCenter = { lat: location.lat(), lng: location.lng() };
        setMapCenter(newCenter);
        map.panTo(newCenter);
      }
    });
  }, [map]);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: MAP_LIBRARIES,
  });

  // --- Event Handlers ---

  const onPolygonComplete = useCallback((newPolygon) => {
    // NEW: Prompt for both name and description
    const name = window.prompt("Enter a name for this area:", "Unnamed Area");
    if (!name) {
      newPolygon.setMap(null);
      return;
    }
    const description = window.prompt(`Enter a description for "${name}":`, "");

    const newPaths = newPolygon.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));
    // NEW: Add description to the saved object
    const newPolygonObject = { id: Date.now(), name, description, paths: newPaths };
    
    setPolygons(current => {
      const updated = [...current, newPolygonObject];
      localStorage.setItem('niper-mapped-areas', JSON.stringify(updated));
      return updated;
    });
    newPolygon.setMap(null);
  }, []);
  
  const handleClearAll = () => {
    if (window.confirm("Delete all mapped areas?")) {
      setPolygons([]);
      setActivePolygonId(null);
      localStorage.removeItem('niper-mapped-areas');
    }
  };
  
  const onMapLoad = useCallback((mapInstance) => setMap(mapInstance), []);
  const getPolygonCenter = (paths) => {
    const bounds = new window.google.maps.LatLngBounds();
    paths.forEach(p => bounds.extend(p));
    return bounds.getCenter();
  };

  // NEW: Handler for when a user clicks a result in the sidebar
  const handleSearchResultClick = useCallback((polygonId) => {
    if (!map) return;
    const polygon = polygons.find(p => p.id === polygonId);
    if (polygon) {
      const center = getPolygonCenter(polygon.paths);
      map.panTo(center);
      map.setZoom(18); // Zoom in closer on selection
      setActivePolygonId(polygonId);
    }
  }, [map, polygons]);

  // --- Render Logic ---

  if (loadError) return <div>Error loading maps.</div>;
  if (!isLoaded) return <div className="loading-text">Loading Map...</div>;

  return (
    <div className="app-container">
      {/* NEW: Render the Sidebar */}
      <Sidebar
        polygons={polygons}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onResultClick={handleSearchResultClick}
      />

      {/* NEW: Main content wrapper */}
      <div className="main-content">
        <header className="admin-panel">
          <h1>NIPER Mohali Map Editor</h1>
          <div className="admin-controls">
            {isAdminMode && <button onClick={handleClearAll}>Clear All Areas</button>}
            <label><input type="checkbox" checked={isAdminMode} onChange={() => setIsAdminMode(e => !e)}/> Admin Mode</label>
          </div>
        </header>

        <main className="map-container">
          <GoogleMap mapContainerStyle={MAP_CONTAINER_STYLE} center={mapCenter} zoom={17} onLoad={onMapLoad}>
            {/* Filter polygons based on search before mapping */}
            {polygons
              .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((polygon, index) => (
                <React.Fragment key={polygon.id}>
                  <Polygon
                    paths={polygon.paths}
                    onClick={() => setActivePolygonId(polygon.id)}
                    options={{
                      // NEW: Use alternating colors
                      fillColor: POLYGON_COLORS[index % POLYGON_COLORS.length],
                      strokeColor: POLYGON_COLORS[index % POLYGON_COLORS.length],
                      fillOpacity: 0.4,
                      strokeWeight: 2,
                      clickable: true,
                    }}
                  />
                  {activePolygonId === polygon.id && (
                    <InfoWindow position={getPolygonCenter(polygon.paths)} onCloseClick={() => setActivePolygonId(null)}>
                      <div>
                        <h3 style={{ margin: 0 }}>{polygon.name}</h3>
                        {/* NEW: Display the description */}
                        {polygon.description && <p style={{ margin: '5px 0 0 0' }}>{polygon.description}</p>}
                        <p style={{ margin: '8px 0 0 0', fontSize: '0.8em', color: '#666' }}>{NIPER_MOHALI_ADDRESS}</p>
                      </div>
                    </InfoWindow>
                  )}
                </React.Fragment>
              ))}

            {isAdminMode && <DrawingManager onPolygonComplete={onPolygonComplete} options={{
              drawingControl: true,
              drawingControlOptions: { position: window.google.maps.ControlPosition.TOP_CENTER, drawingModes: [window.google.maps.drawing.OverlayType.POLYGON] },
              polygonOptions: { fillColor: "#00FF00", fillOpacity: 0.5, strokeWeight: 2, editable: true, zIndex: 1 },
            }} />}
          </GoogleMap>
        </main>
      </div>
    </div>
  );
}

export default App;