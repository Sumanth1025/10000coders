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

function getCoordinates(incident) {
  const latitude = Number(incident.latitude);
  const longitude = Number(incident.longitude);

  if (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  ) {
    return [latitude, longitude];
  }

  return null;
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
      incidents
        .map((incident) => getCoordinates(incident))
        .filter(Boolean),
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

  {incidents.map((incident) => {
  const position = getCoordinates(incident);

  if (!position) {
    return null;
  }

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