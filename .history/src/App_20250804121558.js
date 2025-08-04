import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Polygon, DrawingManager, InfoWindow } from '@react-google-maps/api';
import './App.css';

// --- Configuration ---
const NIPER_MOHALI_COORDS = { lat: 30.74233, lng: 76.73385 };
const NIPER_MOHALI_ADDRESS = "National Institute of Pharmaceutical Education and Research (NIPER), Sector 67, Sahibzada Ajit Singh Nagar, Punjab 160062"; // NEW: The address you provided
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };
const MAP_LIBRARIES = ['drawing', 'places'];

function App() {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [polygons, setPolygons] = useState([]);
  const [activePolygonId, setActivePolygonId] = useState(null); // NEW: To track which InfoWindow to show

  // Load polygons from localStorage
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

  const onPolygonComplete = useCallback((newPolygon) => {
    // NEW: Prompt the admin for a name for the new area
    const areaName = window.prompt("Enter a name for this area (e.g., 'Academic Block'):", "Unnamed Area");
    
    // If the admin cancels the prompt, don't save the polygon
    if (areaName === null) {
      newPolygon.setMap(null); // Remove the temporary drawing
      return;
    }

    const newPaths = newPolygon.getPath().getArray().map(latLng => ({
      lat: latLng.lat(),
      lng: latLng.lng(),
    }));

    // NEW: The polygon object now includes a name
    const newPolygonObject = {
      id: new Date().getTime(),
      name: areaName,
      paths: newPaths,
    };

    setPolygons(currentPolygons => {
      const updatedPolygons = [...currentPolygons, newPolygonObject];
      localStorage.setItem('niper-mapped-areas', JSON.stringify(updatedPolygons));
      return updatedPolygons;
    });

    newPolygon.setMap(null);
  }, []);

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to delete all mapped areas?")) {
      setPolygons([]);
      setActivePolygonId(null); // NEW: Clear active polygon
      localStorage.removeItem('niper-mapped-areas');
    }
  };
  
  // NEW: Handler for clicking on a polygon
  const handlePolygonClick = (polygonId) => {
    setActivePolygonId(polygonId);
  };

  // NEW: Get the center of a polygon to position the InfoWindow
  const getPolygonCenter = (paths) => {
    const bounds = new window.google.maps.LatLngBounds();
    paths.forEach(path => bounds.extend(path));
    return bounds.getCenter();
  };

  // --- Render Logic ---

  if (loadError) return <div>Error loading maps. Check your API key and configuration.</div>;
  if (!isLoaded) return <div className="loading-text">Loading Map...</div>;

  return (
    <div className="app-container">
      <header className="admin-panel">
        <h1>NIPER Mohali Map Editor</h1>
        <div className="admin-controls">
          {isAdminMode && <button onClick={handleClearAll}>Clear All Areas</button>}
          <label>
            <input type="checkbox" checked={isAdminMode} onChange={() => setIsAdminMode(!isAdminMode)} />
            Admin Mode
          </label>
        </div>
      </header>
      
      <main className="map-container">
        <GoogleMap mapContainerStyle={MAP_CONTAINER_STYLE} center={NIPER_MOHALI_COORDS} zoom={17}>
          {polygons.map(polygon => (
            <React.Fragment key={polygon.id}>
              <Polygon
                paths={polygon.paths}
                options={{
                  fillColor: "#FF0000",
                  fillOpacity: 0.3,
                  strokeColor: "#FF0000",
                  strokeWeight: 2,
                  clickable: true, // NEW: Make polygon clickable
                }}
                onClick={() => handlePolygonClick(polygon.id)} // NEW: Set this polygon as active on click
              />

              {/* NEW: Show InfoWindow if this polygon is the active one */}
              {activePolygonId === polygon.id && (
                <InfoWindow
                  position={getPolygonCenter(polygon.paths)}
                  onCloseClick={() => setActivePolygonId(null)} // Hide InfoWindow on 'x' click
                >
                  <div>
                    <h3 style={{ margin: 0 }}>{polygon.name}</h3>
                    <p style={{ margin: '5px 0 0 0' }}>{NIPER_MOHALI_ADDRESS}</p>
                  </div>
                </InfoWindow>
              )}
            </React.Fragment>
          ))}

          {isAdminMode && (
            <DrawingManager
              onPolygonComplete={onPolygonComplete}
              options={{
                drawingControl: true,
                drawingControlOptions: { position: window.google.maps.ControlPosition.TOP_CENTER, drawingModes: [window.google.maps.drawing.OverlayType.POLYGON] },
                polygonOptions: { fillColor: "#00FF00", fillOpacity: 0.5, strokeWeight: 2, clickable: false, editable: true, zIndex: 1 },
              }}
            />
          )}
        </GoogleMap>
      </main>
    </div>
  );
}

export default App;