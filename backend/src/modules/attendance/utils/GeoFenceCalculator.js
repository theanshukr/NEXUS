/**
 * GeoFenceCalculator — M-05 Attendance Utility
 *
 * Validates whether a given GPS coordinate falls within the radius of an assigned office.
 * Uses the Haversine formula for spherical Earth distance calculation.
 *
 * Returns a structured result with a machine-readable status code rather than a boolean,
 * so managers immediately understand why a clock-in was flagged.
 *
 * STABILITY PATCH (1.6):
 * - [P] Guard against null office coordinates. Locations may have no GPS configured.
 *       In that case we return LOCATION_DISABLED rather than silently computing NaN.
 */

const EARTH_RADIUS_METERS = 6_371_000;

/**
 * Converts degrees to radians.
 * @param {number} degrees
 * @returns {number}
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Calculates the great-circle distance between two GPS points using the Haversine formula.
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} Distance in meters.
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Validates a GPS coordinate against the office geofence configuration.
 *
 * @param {Object} params
 * @param {number} params.lat - Employee GPS latitude
 * @param {number} params.lng - Employee GPS longitude
 * @param {number} params.gpsAccuracyMeters - Reported browser GPS accuracy (95% confidence radius)
 * @param {number|null} params.officeLat - Office latitude (from Location model; may be null)
 * @param {number|null} params.officeLng - Office longitude (from Location model; may be null)
 * @param {number} params.allowedRadiusMeters - Geofence radius (from Location.geofenceRadiusMeters)
 * @param {string} [params.geofenceFailureReason] - Client-reported reason for missing/inaccurate GPS
 *
 * @returns {{ status: string, distanceFromOfficeMeters: number|null, gpsAccuracyMeters: number|null }}
 */
export function validateGeofence({
  lat,
  lng,
  gpsAccuracyMeters = 0,
  officeLat,
  officeLng,
  allowedRadiusMeters,
  geofenceFailureReason = null
}) {
  // Client explicitly reported a failure reason (e.g., user denied permission).
  if (geofenceFailureReason) {
    const mapped = {
      LOCATION_DISABLED: 'LOCATION_DISABLED',
      LOCATION_PERMISSION_DENIED: 'LOCATION_PERMISSION_DENIED',
      LOCATION_TIMEOUT: 'LOCATION_TIMEOUT'
    };
    return {
      status: mapped[geofenceFailureReason] || 'LOCATION_DISABLED',
      distanceFromOfficeMeters: null,
      gpsAccuracyMeters: null
    };
  }

  // [FIX P] Guard: Office has no GPS coordinates configured.
  // Instead of letting haversineDistance receive null values (producing NaN and
  // silently failing with OUTSIDE_RADIUS), return an explicit status that allows
  // downstream logic to decide how to proceed (e.g. autoApproveGeofence bypass).
  if (officeLat == null || officeLng == null) {
    return {
      status: 'LOCATION_DISABLED',
      distanceFromOfficeMeters: null,
      gpsAccuracyMeters: gpsAccuracyMeters || null
    };
  }

  // GPS accuracy is so poor that the reading is unreliable (> 200m error radius is not actionable).
  if (gpsAccuracyMeters > 200) {
    return {
      status: 'GPS_INACCURATE',
      distanceFromOfficeMeters: null,
      gpsAccuracyMeters
    };
  }

  const distance = haversineDistance(lat, lng, officeLat, officeLng);

  return {
    status: distance <= allowedRadiusMeters ? 'VALID' : 'OUTSIDE_RADIUS',
    distanceFromOfficeMeters: Math.round(distance),
    gpsAccuracyMeters: gpsAccuracyMeters || null
  };
}

export default { haversineDistance, validateGeofence };
