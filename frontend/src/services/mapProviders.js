// Enterprise Fleet Map Tile Providers (MapBox API + High-Definition Fallbacks)

export const DEFAULT_MAPBOX_TOKEN = (typeof window !== 'undefined' && (
  window.localStorage.getItem('mapbox_access_token') || 
  import.meta.env?.VITE_MAPBOX_TOKEN || 
  ''
)) || '';

export function getStoredMapboxToken() {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem('mapbox_access_token') || import.meta.env?.VITE_MAPBOX_TOKEN || '';
}

export function setStoredMapboxToken(token) {
  if (typeof window === 'undefined') return;
  if (token && token.trim()) {
    window.localStorage.setItem('mapbox_access_token', token.trim());
  } else {
    window.localStorage.removeItem('mapbox_access_token');
  }
}

/**
 * Returns the tile configuration for a given provider ID,
 * injecting the active MapBox API token if available.
 */
export function getMapProvider(providerId, userToken = '') {
  const token = (userToken || getStoredMapboxToken() || '').trim();

  // MapBox Official API Styles
  if (providerId === 'mapbox_nav' || providerId === 'mapbox') {
    if (token) {
      return {
        id: 'mapbox_nav',
        label: 'MapBox Navigation',
        icon: '🌌',
        isMapbox: true,
        hint: 'MapBox Official Navigation Night Style (Live Telematics Optimized)',
        url: `https://api.mapbox.com/styles/v1/mapbox/navigation-night-v1/tiles/256/{z}/{x}/{y}@2x?access_token=${token}`,
        options: {
          maxZoom: 22,
          tileSize: 256,
          attribution: '&copy; <a href="https://www.mapbox.com/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }
      };
    }
  }

  if (providerId === 'mapbox_dark') {
    if (token) {
      return {
        id: 'mapbox_dark',
        label: 'MapBox Dark v11',
        icon: '🌑',
        isMapbox: true,
        hint: 'MapBox Official Dark Tactical Vector Tiles',
        url: `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/{z}/{x}/{y}@2x?access_token=${token}`,
        options: {
          maxZoom: 22,
          tileSize: 256,
          attribution: '&copy; <a href="https://www.mapbox.com/">Mapbox</a>'
        }
      };
    }
  }

  if (providerId === 'mapbox_satellite') {
    if (token) {
      return {
        id: 'mapbox_satellite',
        label: 'MapBox Satellite',
        icon: '🛰️',
        isMapbox: true,
        hint: 'MapBox High-Resolution Satellite with Highway Overlays',
        url: `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${token}`,
        options: {
          maxZoom: 22,
          tileSize: 256,
          attribution: '&copy; <a href="https://www.mapbox.com/">Mapbox</a>'
        }
      };
    }
  }

  if (providerId === 'mapbox_streets') {
    if (token) {
      return {
        id: 'mapbox_streets',
        label: 'MapBox Streets',
        icon: '🛣️',
        isMapbox: true,
        hint: 'MapBox Global Highways & Arterial Corridors',
        url: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${token}`,
        options: {
          maxZoom: 22,
          tileSize: 256,
          attribution: '&copy; <a href="https://www.mapbox.com/">Mapbox</a>'
        }
      };
    }
  }

  // Professional High-Definition Default Providers (100% Free & Watermark-Free)
  const providers = {
    // Ultra-clean high-contrast dark telemetry map with crisp highway lines & city nodes (Zero Watermarks)
    dark: {
      id: 'dark',
      label: 'Dark Tactical',
      icon: '🌑',
      hint: 'Professional Fleet Telematics Dark Base with High-Contrast Roadways & City Labels',
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      options: {
        maxZoom: 19,
        className: 'dark-tactical-tiles',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }
    },
    satellite: {
      id: 'satellite',
      label: 'Satellite HD',
      icon: '🛰️',
      hint: 'High-Resolution Esri World Imagery Satellite Tiles',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      options: {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri, Earthstar Geographics'
      }
    },
    streets: {
      id: 'streets',
      label: 'Corridor Streets',
      icon: '🛣️',
      hint: 'OpenStreetMap Full Highway & City Corridor Tiles',
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      options: {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }
    },
    esri_dark: {
      id: 'esri_dark',
      label: 'Esri Canvas',
      icon: '🗺️',
      hint: 'Esri World Dark Gray Canvas Base',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      options: {
        maxZoom: 18,
        attribution: 'Tiles &copy; Esri'
      }
    }
  };

  return providers[providerId] || providers.dark;
}

// Map layer selector choices exposed in top toolbar
export const FREE_MAP_PROVIDERS = {
  dark: {
    id: 'dark',
    label: 'Dark Tactical',
    icon: '🌑',
    hint: 'High-Contrast Pro Dark Base with Highway Corridors'
  },
  satellite: {
    id: 'satellite',
    label: 'Satellite HD',
    icon: '🛰️',
    hint: 'Photorealistic Satellite Ground Imagery'
  },
  streets: {
    id: 'streets',
    label: 'Streets',
    icon: '🛣️',
    hint: 'Clean Corridor Roadways & Interchanges'
  },
  osm: {
    id: 'osm',
    label: 'OSM Standard',
    icon: '🗺️',
    hint: 'OpenStreetMap Open GIS'
  }
};
