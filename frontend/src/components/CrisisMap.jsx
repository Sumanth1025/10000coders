import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

const HYDERABAD_CENTER = [17.3850, 78.4867];

const LOCATION_COORDINATES = {
  "miyapur": [17.4969, 78.3483],
  "miyapur, hyderabad": [17.4969, 78.3483],

  "kukatpally": [17.4849, 78.4138],
  "kukatpally, hyderabad": [17.4849, 78.4138],

  "hitech city": [17.4483, 78.3915],
  "hitech city, hyderabad": [17.4483, 78.3915],

  "ameerpet": [17.4375, 78.4483],
  "ameerpet, hyderabad": [17.4375, 78.4483],

  "madhapur": [17.4486, 78.3908],
  "madhapur, hyderabad": [17.4486, 78.3908],

  "gachibowli": [17.4401, 78.3489],
  "gachibowli, hyderabad": [17.4401, 78.3489],

  "secunderabad": [17.4399, 78.4983],
  "secunderabad, hyderabad": [17.4399, 78.4983],

  "lb nagar": [17.3457, 78.5522],
  "lb nagar, hyderabad": [17.3457, 78.5522],

  "banjara hills": [17.4156, 78.4347],
  "banjara hills, hyderabad": [17.4156, 78.4347],

  "jubilee hills": [17.4319, 78.4071],
  "jubilee hills, hyderabad": [17.4319, 78.4071],

  "charminar": [17.3616, 78.4747],
  "charminar, hyderabad": [17.3616, 78.4747],
};

function getCoordinates(location, index) {
  const key = String(location || "").trim().toLowerCase();

  if (LOCATION_COORDINATES[key]) {
    return LOCATION_COORDINATES[key];
  }

  const offsets = [
    [0, 0],
    [0.025, 0.030],
    [-0.025, 0.025],
    [0.020, -0.035],
    [-0.030, -0.025],
    [0.035, -0.015],
  ];

  const offset = offsets[index % offsets.length];

  return [
    HYDERABAD_CENTER[0] + offset[0],
    HYDERABAD_CENTER[1] + offset[1],
  ];
}

function getPriorityColor(priority) {
  if (priority === "P1") return "#ff304f";
  if (priority === "P2") return "#ff7900";
  if (priority === "P3") return "#ffc400";
  return "#16d66b";
}

function getIncidentIcon(type) {
  const icons = {
    Fire: "🔥",
    Flood: "🌊",
    Accident: "🚗",
    Medical: "🏥",
    Earthquake: "🌍",
    Storm: "⛈️",
    Other: "⚠️",
  };

  return icons[type] || "⚠️";
}

function MapAutoFit({ incidents }) {
  const map = useMap();

  const positions = useMemo(
    () =>
      incidents.map((incident, index) =>
        getCoordinates(incident.location, index)
      ),
    [incidents]
  );

  useEffect(() => {
    if (positions.length === 1) {
      map.setView(positions[0], 12);
    }

    if (positions.length > 1) {
      map.fitBounds(positions, {
        padding: [45, 45],
        maxZoom: 12,
      });
    }
  }, [map, positions]);

  return null;
}

export default function CrisisMap({
  incidents,
  onSelectIncident,
}) {
  return (
    <div className="crisis-map-wrapper">

      <MapContainer
  center={HYDERABAD_CENTER}
  zoom={11}
  scrollWheelZoom={true}
  className="crisis-map"
>

  <TileLayer
    attribution="&copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
  />

  <MapAutoFit incidents={incidents} />

  {incidents.map((incident, index) => {
    const position = getCoordinates(
      incident.location,
      index
    );

    const priority = incident.priority || "P4";
    const color = getPriorityColor(priority);

    return (
      <CircleMarker
        key={incident.id}
        center={position}
        radius={priority === "P1" ? 14 : 11}
        pathOptions={{
          color: color,
          fillColor: color,
          fillOpacity: 0.9,
          weight: 3,
        }}
        eventHandlers={{
          click: () => onSelectIncident(incident),
        }}
      >

       <Popup>
  <div className="map-popup">

    <div className="popup-title">
      <span>
        {getIncidentIcon(incident.incident_type)}
      </span>

      <strong>
        {incident.incident_type}
      </strong>
    </div>

    <div className="popup-priority">
      <span className={`popup-priority-badge ${priority.toLowerCase()}`}>
        {priority}
      </span>

      <span>{incident.severity}</span>
    </div>

    <div className="popup-row">
      📍 {incident.location}
    </div>

    <div className="popup-row">
      Risk:{" "}
      <strong>
        {Number(incident.risk_score || 0).toFixed(0)}
        /100
      </strong>
    </div>

    {incident.people_affected && (
      <div className="popup-flag">
        👥 People affected
      </div>
    )}

    {incident.people_trapped && (
      <div className="popup-flag">
        🚨 People trapped
      </div>
    )}

    {incident.rescue_required && (
      <div className="popup-flag">
        🚑 Rescue required
      </div>
    )}

    {incident.road_blocked && (
      <div className="popup-flag">
        🚧 Road blocked
      </div>
    )}

    <button
      className="popup-button"
      onClick={() => onSelectIncident(incident)}
    >
      View Incident Intelligence
    </button>

  </div>
</Popup>
      </CircleMarker>
    );
  })}

</MapContainer>

      {/* MAP OVERLAY */}
      <div className="map-overlay">

        <div className="map-title">
          <span className="live-pulse"></span>
          LIVE CRISIS MAP
        </div>

        <div className="map-subtitle">
          {incidents.length} intelligence points
        </div>

      </div>

      {/* MAP LEGEND */}
      <div className="map-legend">

        <div>
          <span className="legend-dot p1"></span>
          P1 Critical
        </div>

        <div>
          <span className="legend-dot p2"></span>
          P2 Urgent
        </div>

        <div>
          <span className="legend-dot p3"></span>
          P3 Moderate
        </div>

        <div>
          <span className="legend-dot p4"></span>
          P4 Low
        </div>

      </div>

    </div>
  );
}