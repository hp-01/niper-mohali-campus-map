import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Polygon, DrawingManager } from '@react-google-maps/api';
import './App.css';

// --- Configuration ---
const NIPER_MOHALI_COORDS = { lat: 30.7423, lng: 76.7338 };
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };
const MAP_LIBRARIES = ['drawing', 'places']; // Enable drawing tools

function App() {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [polygons, setPolygons] = useState([]);

  // Load polygons from localStorage on initial render
  useEffect(() => {
    const savedPolygons = localStorage.getItem('niper-mapped-areas');
    if (savedPolygons) {
      setPolygons(JSON.parse(savedPolygons));
    }
  }, []);

  // --- Google Maps API Loader Hook ---
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: MAP_LIBRARIES,
  });

  // --- Event Handlers ---

  // Called when the admin finishes drawing a polygon
  const onPolygonComplete = useCallback((newPolygon) => {
    // Get the coordinates of the new polygon
    const newPaths = newPolygon.getPath().getArray().map(latLng => ({
      lat: latLng.lat(),
      lng: latLng.lng(),
    }));

    // Create a new polygon object with a unique ID
    const newPolygonObject = {
      id: new Date().getTime(), // Simple unique ID
      paths: newPaths,
    };

    // Update state and save to localStorage
    setPolygons(currentPolygons => {
      const updatedPolygons = [...currentPolygons, newPolygonObject];
      localStorage.setItem('niper-mapped-areas', JSON.stringify(updatedPolygons));
      return updatedPolygons;
    });

    // Remove the temporary drawing from the map, as we will now render it from our state
    newPolygon.setMap(null);
  }, []);

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to delete all mapped areas?")) {
      setPolygons([]);
      localStorage.removeItem('niper-mapped-areas');
    }
  };

  // --- Render Logic ---

  if (loadError) return <div>Error loading maps. Check your API key and configuration.</div>;
  if (!isLoaded) return <div className="loading-text">Loading Map...</div>;

  return (
    <div className="app-container">
      {/* Top Admin Panel */}
      <header className="admin-panel">
        <h1>NIPER Mohali Map Editor</h1>
        <div className="admin-controls">
          {isAdminMode && (
            <button onClick={handleClearAll}>Clear All Areas</button>
          )}
          <label>
            <input
              type="checkbox"
              checked={isAdminMode}
              onChange={() => setIsAdminMode(!isAdminMode)}
            />
            Admin Mode
          </label>
        </div>
      </header>

      {/* Map Container */}
      <main className="map-container">
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER_STYLE}
          center={NIPER_MOHALI_COORDS}
          zoom={17}
        >
          {/* Display all saved polygons */}
          {polygons.map(polygon => (
            <Polygon
              key={polygon.id}
              paths={polygon.paths}
              options={{
                fillColor: "#FF0000",
                fillOpacity: 0.3,
                strokeColor: "#FF0000",
                strokeWeight: 2,
              }}
            />
          ))}

          {/* Show Drawing Manager ONLY in Admin Mode */}
          {isAdminMode && (
            <DrawingManager
              onPolygonComplete={onPolygonComplete}
              options={{
                drawingControl: true,
                drawingControlOptions: {
                  position: window.google.maps.ControlPosition.TOP_CENTER,
                  drawingModes: [window.google.maps.drawing.OverlayType.POLYGON],
                },
                polygonOptions: {
                  fillColor: "#00FF00", // Green for drawing
                  fillOpacity: 0.5,
                  strokeWeight: 2,
                  clickable: false,
                  editable: true,
                  zIndex: 1,
                },
              }}
            />
          )}
        </GoogleMap>
      </main>
    </div>
  );
}

export default App;