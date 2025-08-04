import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Polygon, DrawingManager, InfoWindow } from '@react-google-maps/api';
import Sidebar from './Sidebar';
import defaultAreas from './niper-areas.json';
import './App.css';

const NIPER_SEARCH_QUERY = "NIPER, Sector 67, Mohali";
const FALLBACK_COORDS = { lat: 30.74233, lng: 76.73385 };
const NIPER_MOHALI_ADDRESS = "National Institute of Pharmaceutical Education and Research (NIPER), Sector 67, SAS Nagar, Punjab 160062";
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };
const MAP_LIBRARIES = ['drawing', 'places'];
const POLYGON_COLORS = ['#1E90FF', '#32CD32', '#FF7F50', '#9370DB', '#FFD700'];

function App() {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [polygons, setPolygons] = useState([]);
  const [activePolygonId, setActivePolygonId] = useState(null);
  const [map, setMap] = useState(null);
  const [mapCenter, setMapCenter] = useState(FALLBACK_COORDS);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // NEW: State for sidebar visibility

  // Initial data load
  useEffect(() => {
    const savedPolygons = localStorage.getItem('niper-mapped-areas');
    setPolygons(savedPolygons ? JSON.parse(savedPolygons) : defaultAreas);
  }, []);

  // Center map on load
  useEffect(() => {
    if (!map) return;
    const service = new window.google.maps.places.PlacesService(map);
    service.textSearch({ query: NIPER_SEARCH_QUERY }, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results?.[0]) {
        const newCenter = { lat: results[0].geometry.location.lat(), lng: results[0].geometry.location.lng() };
        setMapCenter(newCenter);
        map.panTo(newCenter);
      }
    });
  }, [map]);

  // Hide sidebar by default on mobile
  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth > 768);
    window.addEventListener('resize', handleResize);
    handleResize(); // Call once on initial load
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY, libraries: MAP_LIBRARIES });

  const onPolygonComplete = useCallback((newPolygon) => {
    const name = window.prompt("Enter a name for this area:", "Unnamed Area");
    if (!name) { newPolygon.setMap(null); return; }
    const description = window.prompt(`Enter a description for "${name}":`, "");
    const newPaths = newPolygon.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));
    const newPolygonObject = { id: Date.now(), name, description, paths: newPaths };
    setPolygons(current => {
      const updated = [...current, newPolygonObject];
      localStorage.setItem('niper-mapped-areas', JSON.stringify(updated));
      return updated;
    });
    newPolygon.setMap(null);
  }, []);

  // NEW: Function to delete a polygon
  const handleDeletePolygon = useCallback((polygonIdToDelete) => {
    if (!window.confirm("Are you sure you want to delete this area?")) return;

    setPolygons(current => {
      const updated = current.filter(p => p.id !== polygonIdToDelete);
      localStorage.setItem('niper-mapped-areas', JSON.stringify(updated));
      return updated;
    });
    setActivePolygonId(null); // Close the info window
  }, []);

  const handleSearchResultClick = useCallback((polygonId) => {
    if (!map) return;
    const polygon = polygons.find(p => p.id === polygonId);
    if (polygon) {
      const center = getPolygonCenter(polygon.paths);
      map.panTo(center);
      map.setZoom(18);
      setActivePolygonId(polygonId);
    }
  }, [map, polygons]);

  const onMapLoad = useCallback((mapInstance) => setMap(mapInstance), []);
  const getPolygonCenter = (paths) => {
    const bounds = new window.google.maps.LatLngBounds();
    paths.forEach(p => bounds.extend(p));
    return bounds.getCenter();
  };

  if (loadError) return <div>Error loading maps.</div>;
  if (!isLoaded) return <div className="loading-text">Loading Map...</div>;

  return (
    <div className="app-container">
      {/* Add 'open' class conditionally */}
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <Sidebar
          polygons={polygons}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onResultClick={handleSearchResultClick}
          onClose={() => setIsSidebarOpen(false)} // Pass the close handler
        />
      </div>

      <div className="main-content">
        {/* NEW: Hamburger menu button */}
        <button className="menu-button" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          <span></span>
          <span></span>
          <span></span>
        </button>

        <header className="admin-panel">
          <h1>NIPER Mohali Map</h1>
          <div className="admin-controls">
            {isAdminMode && <button onClick={() => setPolygons([]) & localStorage.removeItem('niper-mapped-areas')}>Clear All</button>}
            <label><input type="checkbox" checked={isAdminMode} onChange={() => setIsAdminMode(e => !e)} /> Admin Mode</label>
          </div>
        </header>

        <main className="map-container">
          <GoogleMap mapContainerStyle={MAP_CONTAINER_STYLE} center={mapCenter} zoom={17} onLoad={onMapLoad} options={{ streetViewControl: false, mapTypeControl: false }}>
            {polygons
              .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((polygon, index) => (
                <React.Fragment key={polygon.id}>
                  <Polygon
                    paths={polygon.paths}
                    onClick={() => setActivePolygonId(polygon.id)}
                    options={{ fillColor: POLYGON_COLORS[index % POLYGON_COLORS.length], strokeColor: POLYGON_COLORS[index % POLYGON_COLORS.length], fillOpacity: 0.4, strokeWeight: 2, clickable: true }}
                  />
                  {activePolygonId === polygon.id && (
                    <InfoWindow position={getPolygonCenter(polygon.paths)} onCloseClick={() => setActivePolygonId(null)}>
                      <div>
                        <h3 style={{ margin: 0 }}>{polygon.name}</h3>
                        {polygon.description && <p style={{ margin: '5px 0' }}>{polygon.description}</p>}
                        {/* NEW: Conditionally render the delete button */}
                        {isAdminMode && (
                          <button className="delete-button" onClick={() => handleDeletePolygon(polygon.id)}>
                            Delete Area
                          </button>
                        )}
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