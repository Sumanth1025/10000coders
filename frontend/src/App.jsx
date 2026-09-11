import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load existing incidents
  const fetchIncidents = async () => {
    try {
      const response = await fetch(`${API_URL}/incidents`);

      if (!response.ok) {
        throw new Error("Failed to fetch incidents");
      }

      const data = await response.json();
      setIncidents(data);
    } catch (err) {
      setError("Could not connect to backend");
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  // Submit new incident
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!description.trim() || !location.trim()) {
      setError("Please enter both description and location.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/incidents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description,
          location,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to create incident");
      }

      // Add newest incident to the top
      setIncidents((prev) => [data, ...prev]);

      // Clear form
      setDescription("");
      setLocation("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div>
          <h1>🚨 CrisisIQ</h1>
          <p>AI-Powered Crisis Intelligence Platform</p>
        </div>

        <div className="status">
          <span className="status-dot"></span>
          System Operational
        </div>
      </header>

      <main className="container">

        {/* Report Section */}
        <section className="report-section">
          <div className="section-title">
            <h2>Report an Emergency</h2>
            <p>
              Describe the emergency and let AI convert it into
              actionable intelligence.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="incident-form">

            <label>
              Incident Description
            </label>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Example: A fire is spreading through a building and several people are trapped inside..."
              rows="5"
            />

            <label>
              Location
            </label>

            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Example: Miyapur"
            />

            {error && (
              <div className="error">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
            >
              {loading ? "Analyzing..." : "🚨 Analyze Incident"}
            </button>

          </form>
        </section>

        {/* Incidents */}
        <section className="incidents-section">

          <div className="section-title">
            <h2>Recent Incidents</h2>
            <p>
              AI-analyzed emergency reports
            </p>
          </div>

          {incidents.length === 0 ? (
            <div className="empty">
              No incidents reported yet.
            </div>
          ) : (
            <div className="incident-grid">

              {incidents.map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                />
              ))}

            </div>
          )}

        </section>

      </main>
    </div>
  );
}


/* Incident Card */

function IncidentCard({ incident }) {

  const severityClass =
    incident.severity?.toLowerCase() || "low";

  return (
    <div className="incident-card">

      <div className="card-top">

        <div>
          <h3>
            {getIncidentIcon(incident.incident_type)}
            {" "}
            {incident.incident_type}
          </h3>

          <p className="location">
            📍 {incident.location}
          </p>
        </div>

        <span className={`severity ${severityClass}`}>
          {incident.severity}
        </span>

      </div>

      <p className="description">
        {incident.description}
      </p>

      <div className="risk">
        <span>Risk Score</span>

        <strong>
          {incident.risk_score}/100
        </strong>
      </div>

      <div className="flags">

        {incident.people_affected && (
          <span>👥 People affected</span>
        )}

        {incident.rescue_required && (
          <span>🚑 Rescue required</span>
        )}

      </div>

      {incident.recommended_actions?.length > 0 && (
        <div className="actions">

          <h4>Recommended Actions</h4>

          <ul>
            {incident.recommended_actions.map(
              (action, index) => (
                <li key={index}>
                  {action}
                </li>
              )
            )}
          </ul>

        </div>
      )}

      <div className="card-footer">
        <span>Status</span>
        <strong>{incident.status}</strong>
      </div>

    </div>
  );
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


export default App;