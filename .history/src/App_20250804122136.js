import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Polygon, DrawingManager, InfoWindow } from '@react-google-maps/api';
import './App.css';
import defaultAreas from './niper-areas.json'; // Import the default map data;

// --- Configuration ---
const NIPER_SEARCH_QUERY = "NIPER, Sector 67, Mohali"; // The search term for accuracy
const FALLBACK_COORDS = { lat: 30.74233, lng: 76.73385 }; // --- CHANGE --- Use as a backup
const NIPER_MOHALI_ADDRESS = "National Institute of Pharmaceutical Education and Research (NIPER), Sector 67, Sahibzada Ajit Singh Nagar, Punjab 160062";
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };
const MAP_LIBRARIES = ['drawing', 'places']; // 'places' is essential for this to work

function App() {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [polygons, setPolygons] = useState([]);
  const [activePolygonId, setActivePolygonId] = useState(null);

  // --- CHANGE ---: New state to hold the map instance and the dynamically found center
  const [map, setMap] = useState(null);
  const [mapCenter, setMapCenter] = useState(FALLBACK_COORDS);

  // Load polygons from localStorage
  // In src/App.js

  // ... (imports and component function start)

  // Load polygons from localStorage, with a fallback to the default JSON file
  useEffect(() => {
    const savedPolygons = localStorage.getItem('niper-mapped-areas');
    if (savedPolygons) {
      // If the user has made their own edits, load those.
      setPolygons(JSON.parse(savedPolygons));
    } else {
      // Otherwise, load the default map from our JSON file.
      setPolygons(defaultAreas);
    }
  }, []);

  // ... (the rest of your App.js file)
  // --- Google Maps API Loader Hook ---
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: MAP_LIBRARIES,
  });

  // --- CHANGE ---: This effect runs once the map has loaded to find the correct center
  useEffect(() => {
    if (!map) return; // If map is not loaded yet, do nothing

    const service = new window.google.maps.places.PlacesService(map);
    service.textSearch({ query: NIPER_SEARCH_QUERY }, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
        const location = results[0].geometry.location;
        console.log("Successfully found location:", location.lat(), location.lng());
        const newCenter = { lat: location.lat(), lng: location.lng() };
        setMapCenter(newCenter); // Update the center in our state
        map.panTo(newCenter); // Smoothly move the map to the new center
      } else {
        console.error(`Places search failed with status: ${status}. Using fallback coordinates.`);
      }
    });
  }, [map]); // This effect depends on the map object

  // --- Event Handlers ---

  const onPolygonComplete = useCallback((newPolygon) => {
    const areaName = window.prompt("Enter a name for this area (e.g., 'Academic Block'):", "Unnamed Area");
    if (areaName === null) {
      newPolygon.setMap(null);
      return;
    }
    const newPaths = newPolygon.getPath().getArray().map(latLng => ({ lat: latLng.lat(), lng: latLng.lng() }));
    const newPolygonObject = { id: new Date().getTime(), name: areaName, paths: newPaths };
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
      setActivePolygonId(null);
      localStorage.removeItem('niper-mapped-areas');
    }
  };

  const handlePolygonClick = (polygonId) => setActivePolygonId(polygonId);
  const getPolygonCenter = (paths) => {
    const bounds = new window.google.maps.LatLngBounds();
    paths.forEach(path => bounds.extend(path));
    return bounds.getCenter();
  };

  // --- CHANGE ---: Callback to get the map instance once it's loaded
  const onMapLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
  }, []);

  // --- Render Logic ---

  if (loadError) return <div>Error loading maps. Check your API key and that the 'Places API' is enabled.</div>;
  if (!isLoaded) return <div className="loading-text">Loading Map...</div>;

  return (
    <div className="app-container">
      <header className="admin-panel">
        <h1>NIPER Mohali Map Editor</h1>
        {/* ... (rest of the header is the same) ... */}
        <div className="admin-controls">
          {isAdminMode && <button onClick={handleClearAll}>Clear All Areas</button>}
          <label>
            <input type="checkbox" checked={isAdminMode} onChange={() => setIsAdminMode(!isAdminMode)} />
            Admin Mode
          </label>
        </div>
      </header>

      <main className="map-container">
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER_STYLE}
          center={mapCenter} // --- CHANGE ---: Use the dynamic mapCenter from state
          zoom={17}
          onLoad={onMapLoad} // --- CHANGE ---: Assign the onLoad callback
        >
          {/* ... (rest of the component JSX is the same) ... */}
          {polygons.map(polygon => (
            <React.Fragment key={polygon.id}>
              <Polygon
                paths={polygon.paths}
                options={{ fillColor: "#FF0000", fillOpacity: 0.3, strokeColor: "#FF0000", strokeWeight: 2, clickable: true }}
                onClick={() => handlePolygonClick(polygon.id)}
              />
              {activePolygonId === polygon.id && (
                <InfoWindow position={getPolygonCenter(polygon.paths)} onCloseClick={() => setActivePolygonId(null)}>
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