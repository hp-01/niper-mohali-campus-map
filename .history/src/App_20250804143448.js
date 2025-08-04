import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Polygon, DrawingManager, InfoWindow, DirectionsRenderer, Marker } from '@react-google-maps/api';
import Sidebar from './Sidebar';
import defaultAreas from './niper-areas.json';
import './App.css';

// Location settings
const LOCATION_SEARCH_QUERY = "Niper SAS Nagar";
const FALLBACK_COORDS = { lat: 30.6831522, lng: 76.729387 };

// Constants
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };
const MAP_LIBRARIES = ['drawing', 'places'];
const POLYGON_COLORS = ['#1E90FF', '#32CD32', '#FF7F50', '#9370DB', '#FFD700'];

function App() {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [polygons, setPolygons] = useState([]);
  const [activePolygonId, setActivePolygonId] = useState(null);
  const [activePolygon, setActivePolygon] = useState(null);
  const [map, setMap] = useState(null);
  const [mapCenter, setMapCenter] = useState(FALLBACK_COORDS);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [directions, setDirections] = useState(null);

  // --- DATA & SETUP EFFECTS ---

  useEffect(() => {
    const savedPolygons = localStorage.getItem('niper-mapped-areas');
    setPolygons(savedPolygons ? JSON.parse(savedPolygons) : defaultAreas);
  }, []);

  useEffect(() => {
    if (!map) return;
    const service = new window.google.maps.places.PlacesService(map);
    service.textSearch({ query: LOCATION_SEARCH_QUERY }, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results?.[0]) {
        const newCenter = { lat: results[0].geometry.location.lat(), lng: results[0].geometry.location.lng() };
        setMapCenter(newCenter);
        map.panTo(newCenter);
      }
    });
  }, [map]);

  // Passive attempt to get user location on load without prompting
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude }),
        (error) => console.warn("Could not get user location on initial load. Will ask on navigation attempt.", error.message)
      );
    }
  }, []);

  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth > 768);
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY, libraries: MAP_LIBRARIES });

  const userLocationIcon = useMemo(() => {
    if (!isLoaded) return null;
    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: "#4285F4",
      fillOpacity: 1,
      strokeColor: "white",
      strokeWeight: 2,
    };
  }, [isLoaded]);

  // --- CORE LOGIC CALLBACKS ---

  /**
   * NEW: A promise-based helper to request the user's location.
   */
  const requestUserLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        (error) => reject(error) // The error object contains a 'code' and 'message'
      );
    });
  }, []);

  /**
   * UPDATED: Navigation logic now interactively asks for permission.
   */
  const handleNavigation = useCallback(async (destination) => {
    let currentLocation = userLocation;

    // If we don't have the location, ask for it now.
    if (!currentLocation) {
      try {
        alert("To calculate a route, the map needs your current location. Please allow access when prompted by your browser.");
        const location = await requestUserLocation();
        setUserLocation(location); // Save for future use
        currentLocation = location;
      } catch (error) {
        if (error.code === 1) { // 1: PERMISSION_DENIED
          alert("Location permission was denied. To use navigation, please enable it in your browser's site settings and refresh the page.");
        } else {
          alert(`Could not get your location. Error: ${error.message}`);
        }
        return; // Stop if we can't get the location
      }
    }
    
    // Proceed with directions if we have a location
    if (!map || !currentLocation) return;
    setDirections(null); // Clear previous routes
    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route({
      origin: currentLocation,
      destination: destination,
      travelMode: window.google.maps.TravelMode.DRIVING,
    }, (result, status) => {
      if (status === window.google.maps.DirectionsStatus.OK) {
        setDirections(result);
        setActivePolygonId(null); // Close InfoWindow after starting navigation
        setActivePolygon(null);
      } else {
        console.error(`Error fetching directions: ${status}`);
        alert("Could not calculate a route. The destination may be unreachable.");
      }
    });
  }, [userLocation, map, requestUserLocation]);

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

  const handleDeletePolygon = useCallback((polygonIdToDelete) => {
    if (!window.confirm("Are you sure you want to delete this area?")) return;
    setPolygons(current => {
      const updated = current.filter(p => p.id !== polygonIdToDelete);
      localStorage.setItem('niper-mapped-areas', JSON.stringify(updated));
      return updated;
    });
    setActivePolygonId(null);
    setActivePolygon(null);
  }, []);

  const getPolygonCenter = (paths) => {
    const bounds = new window.google.maps.LatLngBounds();
    paths.forEach(p => bounds.extend(p));
    return bounds.getCenter();
  };

  const handleSearchResultClick = useCallback((polygonId) => {
    if (!map) return;
    const polygon = polygons.find(p => p.id === polygonId);
    if (polygon) {
      const center = getPolygonCenter(polygon.paths);
      map.panTo(center);
      map.setZoom(18);
      setActivePolygonId(polygonId);
      setActivePolygon(polygon); // Set this as well for the floating button
    }
  }, [map, polygons]);

  const onMapLoad = useCallback((mapInstance) => setMap(mapInstance), []);

  if (loadError) return <div>Error loading maps. Check API Key and ensure all 3 APIs are enabled.</div>;
  if (!isLoaded) return <div className="loading-text">Loading Map...</div>;

  // --- RENDER ---
  return (
    <div className="app-container">
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`} style={{ display: isSidebarOpen ? "block" : "none" }}>
        <Sidebar polygons={polygons} searchTerm={searchTerm} onSearchChange={setSearchTerm} onResultClick={handleSearchResultClick} onClose={() => setIsSidebarOpen(false)} />
      </div>
      <div className="main-content">
        <button className="menu-button" onClick={() => setIsSidebarOpen(!isSidebarOpen)}><span></span><span></span><span></span></button>
        <header className="admin-panel">
          <h1>Location Map Editor</h1>
          <div className="admin-controls">
            {directions && <button className="clear-all-btn" onClick={() => setDirections(null)}>Clear Route</button>}
            {isAdminMode && <button className="clear-all-btn" onClick={() => {
              if (window.confirm("This will delete all areas. Are you sure?")) {
                setPolygons([]);
                localStorage.removeItem('niper-mapped-areas');
              }
            }}>Clear All</button>}
            <label><input type="checkbox" checked={isAdminMode} onChange={() => setIsAdminMode(e => !e)} /> Admin Mode</label>
          </div>
        </header>
        <main className="map-container">
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={mapCenter}
            zoom={17}
            onLoad={onMapLoad}
            options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
          >
            {userLocation && <Marker position={userLocation} title="Your Location" icon={userLocationIcon} />}

            {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: true, polylineOptions: { strokeColor: '#007bff', strokeWeight: 5 } }} />}

            {polygons.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map((polygon, index) => (
              <React.Fragment key={polygon.id}>
                <Polygon
                  paths={polygon.paths}
                  onClick={() => { setActivePolygonId(polygon.id); setActivePolygon(polygon); }}
                  options={{ fillColor: POLYGON_COLORS[index % POLYGON_COLORS.length], strokeColor: POLYGON_COLORS[index % POLYGON_COLORS.length], fillOpacity: 0.4, strokeWeight: 2, clickable: true }}
                />
                {activePolygonId === polygon.id && (
                  <InfoWindow
                    position={getPolygonCenter(polygon.paths)}
                    onCloseClick={() => { setActivePolygonId(null); setActivePolygon(null); }}
                  >
                    <div>
                      <h3 style={{ margin: 0 }}>{polygon.name}</h3>
                      {polygon.description && <p style={{ margin: '5px 0' }}>{polygon.description}</p>}
                      <div className="info-window-buttons">
                        {isAdminMode && (
                          <button className="delete-button" onClick={() => handleDeletePolygon(polygon.id)}>
                            Delete
                          </button>
                        )}
                        <button className="navigate-button" onClick={() => handleNavigation(getPolygonCenter(polygon.paths))}>
                          Navigate
                        </button>
                      </div>
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
        {activePolygon && (
          <div className="floating-button-container">
            <button className='btn' onClick={() => handleNavigation(getPolygonCenter(activePolygon.paths))}>
              Navigate to {activePolygon.name}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;