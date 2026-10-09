/**
 * MyTrash Maps Utility
 * Uses free, open-source APIs — no API key needed:
 *  - Nominatim (OpenStreetMap) for geocoding & address search
 *  - OSRM (Open Source Routing Machine) for route calculation
 */

const USER_AGENT = 'MyTrash/1.0';

/**
 * Search for locations by text query.
 * Returns array of { id, name, latitude, longitude, formattedAddress, mainText, secondaryText }
 */
export const searchLocations = async (query, limit = 5) => {
  if (!query || query.trim().length < 2) return [];

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=${limit}&q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    });
    const data = await response.json();

    if (!Array.isArray(data)) return [];

    return data.map((item) => {
      const name =
        item.name ||
        (item.display_name ? item.display_name.split(',')[0] : 'Unknown location');
      const formattedAddress = item.display_name || name;
      const secondaryText = formattedAddress.startsWith(name)
        ? formattedAddress.slice(name.length + 1).trim()
        : formattedAddress;

      return {
        id: String(item.place_id),
        name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        formattedAddress,
        mainText: name,
        secondaryText,
      };
    });
  } catch (error) {
    console.error('[maps] searchLocations error:', error);
    return [];
  }
};

/**
 * Reverse geocode coordinates to a human-readable address string.
 */
export const reverseGeocode = async (latitude, longitude) => {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    });
    const data = await response.json();
    if (!data || !data.display_name) throw new Error('No result');
    return data.display_name;
  } catch (error) {
    console.error('[maps] reverseGeocode error:', error);
    return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  }
};

/**
 * Compute a driving route between two points using free OSRM.
 * Returns { coordinates: [{latitude, longitude}], distanceMeters, durationSeconds }
 */
export const computeRouteFree = async (origin, destination) => {
  const originStr = `${origin.longitude},${origin.latitude}`;
  const destStr = `${destination.longitude},${destination.latitude}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${originStr};${destStr}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    });
    const data = await response.json();

    if (!data.routes || data.routes.length === 0) throw new Error('No routes found');

    const route = data.routes[0];
    const coordinates = (route.geometry.coordinates || []).map((point) => ({
      latitude: point[1],
      longitude: point[0],
    }));

    return {
      coordinates,
      distanceMeters: route.distance,
      durationSeconds: route.duration,
    };
  } catch (error) {
    console.error('[maps] computeRouteFree error:', error);
    throw error;
  }
};

/**
 * Format seconds into a readable duration string.
 */
export const formatDuration = (seconds) => {
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h} hr ${m} min`;
};
