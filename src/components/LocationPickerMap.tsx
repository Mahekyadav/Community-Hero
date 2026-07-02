/// <reference types="vite/client" />
import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Vite doesn't resolve the relative image URLs that Leaflet's bundled CSS uses internally.
// Explicitly import the PNGs so Vite hashes and serves them, then override the default icon.
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerIconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIconRetinaUrl,
  shadowUrl: markerShadowUrl,
});

export interface LocationPickerMapProps {
  lat: number;
  lng: number;
  onLocationChange: (lat: number, lng: number, address: string) => void;
}

// Free reverse-geocoding via Nominatim (OpenStreetMap). No API key required.
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'CommunityHeroApp/1.0' } },
    );
    const data = await res.json();
    return (data.display_name as string) ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

// Uses Leaflet's built-in map.locate() instead of navigator.geolocation directly.
// Advantages:
//   • map.locate({ setView: true }) auto-pans the map the moment GPS resolves — no
//     separate Recenterer component or gpsFix state required.
//   • Runs inside MapContainer so it has direct access to the map instance via useMap().
//   • locationerror fires on denial/timeout; we silently fall back to the default view.
const GeoLocator: React.FC<{ onFound: (lat: number, lng: number) => void }> = ({ onFound }) => {
  const map = useMap();

  useEffect(() => {
    // Request the user's location. setView:true makes Leaflet pan+zoom automatically.
    map.locate({ setView: true, maxZoom: 15, enableHighAccuracy: true });

    const handleFound = (e: L.LocationEvent) => {
      // Map has already panned here; now notify the parent to update state + address.
      onFound(e.latlng.lat, e.latlng.lng);
    };

    map.on('locationfound', handleFound);
    // locationerror: silently keep the fallback default coordinates and zoom level.

    return () => {
      map.off('locationfound', handleFound);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
};

// Translates map-click events into position changes. Must live inside <MapContainer>.
const ClickHandler: React.FC<{ onPositionChange: (lat: number, lng: number) => void }> = ({
  onPositionChange,
}) => {
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  lat,
  lng,
  onLocationChange,
}) => {
  const markerRef = useRef<L.Marker | null>(null);

  const handlePositionChange = async (newLat: number, newLng: number) => {
    const addr = await reverseGeocode(newLat, newLng);
    onLocationChange(newLat, newLng, addr);
  };

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={13}
      style={{ width: '100%', height: '100%' }}
      scrollWheelZoom
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {/* Geolocation on mount — pans map automatically when GPS resolves */}
      <GeoLocator onFound={handlePositionChange} />

      {/* Intercept map clicks to re-pin the marker */}
      <ClickHandler onPositionChange={handlePositionChange} />

      {/* Controlled marker: position tracks parent state; draggable for fine adjustment */}
      <Marker
        position={[lat, lng]}
        draggable
        ref={markerRef}
        eventHandlers={{
          dragend() {
            const pos = markerRef.current?.getLatLng();
            if (pos) handlePositionChange(pos.lat, pos.lng);
          },
        }}
      />
    </MapContainer>
  );
};
