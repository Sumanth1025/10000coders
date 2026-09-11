import { useEffect, useMemo, useState } from "react";
import "./App.css";
import CrisisMap from "./components/CrisisMap";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const STATUS_OPTIONS = [
  "Reported",
  "Analyzed",
  "Dispatched",
  "In Progress",
  "Resolved",
  "Closed",
];

const PRIORITIES = ["All", "P1", "P2", "P3", "P4"];
const INCIDENT_TYPES = ["All", "Fire", "Flood", "Accident", "Medical", "Earthquake", "Storm", "Other"];

function App() {
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedIncident, setSelectedIncident] = useState(null);

  const fetchIncidents = async () => {
    setRefreshing(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/incidents`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to fetch incidents");
      }

      setIncidents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Could not connect to backend.");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!description.trim() || !location.trim()) {
      setError("Please enter both description and location.");
      setSuccess("");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_URL}/incidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          location: location.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = typeof data.detail === "string" ? data.detail : "Failed to create incident";
        throw new Error(message);
      }

      setIncidents((previous) => [data, ...previous]);
      setDescription("");
      setLocation("");
      setSuccess(`Incident #${data.id} analyzed successfully — ${data.priority} priority.`);
    } catch (err) {
      setError(err.message || "Failed to create incident");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (incidentId, status) => {
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_URL}/incidents/${incidentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail?.message || data.detail || "Failed to update status");
      }

      setIncidents((previous) => previous.map((incident) => incident.id === incidentId ? data : incident));
      setSuccess(`Incident #${incidentId} status updated to ${status}.`);
    } catch (err) {
      setError(err.message || "Failed to update incident status");
    }
  };

  const deleteIncident = async (incidentId) => {
    if (!window.confirm("Delete this incident? This action cannot be undone.")) return;

    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_URL}/incidents/${incidentId}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to delete incident");
      }

      setIncidents((previous) => previous.filter((incident) => incident.id !== incidentId));
      setSuccess(`Incident #${incidentId} deleted.`);
    } catch (err) {
      setError(err.message || "Failed to delete incident");
    }
  };

  const stats = useMemo(() => {
    const total = incidents.length;
    const critical = incidents.filter((item) => item.severity === "Critical").length;
    const highRisk = incidents.filter((item) => ["P1", "P2"].includes(item.priority)).length;
    const rescue = incidents.filter((item) => item.rescue_required).length;
    const active = incidents.filter((item) => !["Resolved", "Closed"].includes(item.status)).length;
    const resolved = incidents.filter((item) => ["Resolved", "Closed"].includes(item.status)).length;
    const p1 = incidents.filter((item) => item.priority === "P1").length;
    const p2 = incidents.filter((item) => item.priority === "P2").length;
    const p3 = incidents.filter((item) => item.priority === "P3").length;
    const p4 = incidents.filter((item) => item.priority === "P4").length;
    return { total, critical, highRisk, rescue, active, resolved, p1, p2, p3, p4 };
  }, [incidents]);

  const filteredIncidents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return incidents
      .filter((incident) => priorityFilter === "All" || incident.priority === priorityFilter)
      .filter((incident) => typeFilter === "All" || incident.incident_type === typeFilter)
      .filter((incident) => statusFilter === "All" || incident.status === statusFilter)
      .filter((incident) => {
        if (!query) return true;
        return `${incident.description} ${incident.location} ${incident.incident_type}`.toLowerCase().includes(query);
      })
      .slice()
      .sort((a, b) => Number(b.priority_score || 0) - Number(a.priority_score || 0));
  }, [incidents, priorityFilter, typeFilter, statusFilter, search]);

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="brand-mark">🚨</div>
          <div>
            <h1>CrisisIQ</h1>
            <p>AI-Powered Crisis Intelligence & Emergency Response</p>
          </div>
        </div>
        <div className="system-status"><span className="status-dot" /> System Operational</div>
      </header>

      <main className="container">
        <section className="hero">
          <div>
            <span className="eyebrow">COMMAND CENTER</span>
            <h2>Responder Dashboard</h2>
            <p>Turn unstructured emergency reports into prioritized, actionable intelligence.</p>
          </div>
          <button className="refresh-button" onClick={fetchIncidents} disabled={refreshing}>
            {refreshing ? "↻ Refreshing..." : "↻ Refresh Data"}
          </button>
        </section>

        <section className="stats-grid">
          <StatCard icon="🚨" title="Total Incidents" value={stats.total} description="All reported incidents" className="blue" />
          <StatCard icon="🔴" title="Critical" value={stats.critical} description="Immediate attention" className="red" />
          <StatCard icon="⚠️" title="High Priority" value={stats.highRisk} description="P1 and P2 queue" className="orange" />
          <StatCard icon="🚑" title="Rescue Required" value={stats.rescue} description="Emergency intervention" className="purple" />
        </section>

        <section className="overview-grid">
          <div className="overview-card">
            <div className="card-heading"><h3>Response Status</h3><span>{stats.active} active</span></div>
            <div className="status-row"><span><i className="small-dot blue-dot" /> Active incidents</span><strong>{stats.active}</strong></div>
            <div className="status-row"><span><i className="small-dot green" /> Resolved / Closed</span><strong>{stats.resolved}</strong></div>
          </div>
          <div className="overview-card">
            <div className="card-heading"><h3>Priority Distribution</h3><span>Backend engine</span></div>
            <div className="priority-bars">
              <PriorityBar label="P1" count={stats.p1} total={stats.total} className="p1" />
              <PriorityBar label="P2" count={stats.p2} total={stats.total} className="p2" />
              <PriorityBar label="P3" count={stats.p3} total={stats.total} className="p3" />
              <PriorityBar label="P4" count={stats.p4} total={stats.total} className="p4" />
            </div>
          </div>
        </section>

                {/* =====================================================
            LIVE OPERATIONS MAP
        ====================================================== */}

        <section className="operations-layout">

          {/* MAP */}

          <div className="map-panel">

            <div className="panel-heading">

              <div>
                <span className="eyebrow">
                  GEOSPATIAL INTELLIGENCE
                </span>

                <h2>Live Crisis Map</h2>

                <p>
                  Real-time emergency incidents and priority levels.
                </p>
              </div>

              <span className="live-badge">
                <span className="live-pulse"></span>
                LIVE
              </span>

            </div>

            <CrisisMap
              incidents={filteredIncidents}
              onSelectIncident={setSelectedIncident}
            />

          </div>


          {/* INCIDENT DETAILS */}

          <aside className="selected-panel">

            <div className="panel-heading">

              <div>
                <span className="eyebrow">
                  INCIDENT INTELLIGENCE
                </span>

                <h2>Incident Details</h2>
              </div>

            </div>


            {selectedIncident ? (

              <div className="selected-incident">

                <div className="selected-icon">
                  {getIncidentIcon(
                    selectedIncident.incident_type
                  )}
                </div>

                <h3>
                  {selectedIncident.incident_type}
                </h3>

                <p className="selected-location">
                  📍 {selectedIncident.location}
                </p>


                <div className="selected-priority">

                  <span
                    className={`priority ${
                      selectedIncident.priority?.toLowerCase()
                    }`}
                  >
                    {selectedIncident.priority}
                  </span>

                  <span>
                    Score{" "}
                    {Number(
                      selectedIncident.priority_score || 0
                    ).toFixed(0)}
                  </span>

                </div>


                <div className="selected-stat-grid">

                  <div>
                    <span>Severity</span>
                    <strong>
                      {selectedIncident.severity}
                    </strong>
                  </div>

                  <div>
                    <span>Risk</span>
                    <strong>
                      {Number(
                        selectedIncident.risk_score || 0
                      ).toFixed(0)}
                      /100
                    </strong>
                  </div>

                  <div>
                    <span>Rescue</span>
                    <strong>
                      {selectedIncident.rescue_required
                        ? "Required"
                        : "Not Required"}
                    </strong>
                  </div>

                  <div>
                    <span>Status</span>
                    <strong>
                      {selectedIncident.status}
                    </strong>
                  </div>

                </div>


                <div className="selected-description">

                  <h4>Situation</h4>

                  <p>
                    {selectedIncident.description}
                  </p>

                </div>


                <div className="selected-flags">

                  {selectedIncident.people_affected && (
                    <span>
                      👥 People affected
                    </span>
                  )}

                  {selectedIncident.rescue_required && (
                    <span>
                      🚑 Rescue required
                    </span>
                  )}

                </div>


                {selectedIncident.recommended_actions?.length > 0 && (

                  <div className="selected-actions">

                    <h4>
                      Recommended Actions
                    </h4>

                    <ul>

                      {selectedIncident.recommended_actions
                        .slice(0, 4)
                        .map((action, index) => (
                          <li key={index}>
                            {action}
                          </li>
                        ))}

                    </ul>

                  </div>

                )}

              </div>

            ) : (

              <div className="no-selection">

                <div>📍</div>

                <h3>
                  Select an incident
                </h3>

                <p>
                  Click a marker on the map to view
                  AI-generated emergency intelligence.
                </p>

              </div>

            )}

          </aside>

        </section>
        
        <section className="report-section">
          <div className="section-title">
            <span className="eyebrow">CITIZEN REPORT</span>
            <h2>Report an Emergency</h2>
            <p>Describe what is happening. Gemini analyzes the report and the priority engine ranks it for responders.</p>
          </div>
          <form onSubmit={handleSubmit} className="incident-form">
            <label htmlFor="description">Incident Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Example: A fire is spreading through a building and several people are trapped inside..."
              rows="5"
              maxLength={5000}
              disabled={loading}
            />
            <div className="field-hint">{description.length}/5000 characters</div>

            <label htmlFor="location">Location</label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Example: Miyapur, Hyderabad"
              maxLength={200}
              disabled={loading}
            />

            {error && <div className="message error">{error}</div>}
            {success && <div className="message success">✓ {success}</div>}

            <button type="submit" disabled={loading}>
              {loading ? "🤖 Analyzing with AI..." : "🚨 Analyze Incident"}
            </button>
          </form>
        </section>

        <section className="incidents-section">
          <div className="queue-heading">
            <div className="section-title">
              <span className="eyebrow">LIVE QUEUE</span>
              <h2>Incident Priority Queue</h2>
              <p>Highest-priority incidents appear first.</p>
            </div>
            <div className="queue-count">{filteredIncidents.length} shown / {incidents.length} total</div>
          </div>

          <div className="filters">
            <div className="search-box">
              <span>⌕</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search location, description or type..." />
            </div>
            <FilterSelect label="Priority" value={priorityFilter} onChange={setPriorityFilter} options={PRIORITIES.map((value) => value === "All" ? value : value)} />
            <FilterSelect label="Type" value={typeFilter} onChange={setTypeFilter} options={INCIDENT_TYPES} />
            <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={["All", ...STATUS_OPTIONS]} />
          </div>

          {filteredIncidents.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📡</div>
              <h3>{incidents.length === 0 ? "No incidents reported yet" : "No matching incidents"}</h3>
              <p>{incidents.length === 0 ? "Submit an emergency report above to populate the responder queue." : "Try changing your filters or search term."}</p>
            </div>
          ) : (
            <div className="incident-grid">
              {filteredIncidents.map((incident) => (
                <IncidentCard key={incident.id} incident={incident} onStatusChange={updateStatus} onDelete={deleteIncident} />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="footer">CrisisIQ • From chaos to actionable intelligence</footer>
    </div>
  );
}

function StatCard({ icon, title, value, description, className }) {
  return <div className={`stat-card ${className}`}><div className="stat-icon">{icon}</div><div className="stat-content"><p>{title}</p><h3>{value}</h3><span>{description}</span></div></div>;
}

function PriorityBar({ label, count, total, className }) {
  const width = total ? Math.max((count / total) * 100, count ? 4 : 0) : 0;
  return <div className="priority-bar-row"><span className={`bar-label ${className}`}>{label}</span><div className="bar-track"><div className={`bar-fill ${className}`} style={{ width: `${width}%` }} /></div><strong>{count}</strong></div>;
}

function FilterSelect({ label, value, onChange, options }) {
  return <label className="filter-control"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option === "All" ? `All ${label.toLowerCase()}s` : option}</option>)}</select></label>;
}

function IncidentCard({ incident, onStatusChange, onDelete }) {
  const priority = incident.priority || "P4";
  const priorityClass = priority.toLowerCase();
  const severityClass = incident.severity?.toLowerCase() || "low";

  return (
    <article className={`incident-card ${priorityClass}-card`}>
      <div className="card-top">
        <div className="incident-title">
          <span className="incident-icon">{getIncidentIcon(incident.incident_type)}</span>
          <div><h3>{incident.incident_type || "Other"}</h3><p className="location">📍 {incident.location}</p></div>
        </div>
        <div className="priority-badge"><span className={`priority ${priorityClass}`}>{priority}</span><span className="priority-label">Score {Number(incident.priority_score || 0).toFixed(0)}</span></div>
      </div>

      <div className="incident-meta"><span className={`severity ${severityClass}`}>{incident.severity || "Unknown"}</span><span className="risk-score">Risk <strong>{Number(incident.risk_score || 0).toFixed(0)}/100</strong></span></div>
      <p className="description">{incident.description}</p>

      <div className="flags">
        {incident.people_affected && <span>👥 People affected</span>}
        {incident.rescue_required && <span>🚑 Rescue required</span>}
        {!incident.people_affected && !incident.rescue_required && <span>✓ No immediate rescue flag</span>}
      </div>

      {incident.recommended_actions?.length > 0 && <div className="actions"><h4>Recommended Actions</h4><ul>{incident.recommended_actions.map((action, index) => <li key={index}>{action}</li>)}</ul></div>}

      <div className="card-footer">
        <label className="status-control"><span>Status</span><select value={incident.status} onChange={(event) => onStatusChange(incident.id, event.target.value)}>{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
        <button type="button" className="delete-button" onClick={() => onDelete(incident.id)}>Delete</button>
      </div>
    </article>
  );
}

function getIncidentIcon(type) {
  const icons = { Fire: "🔥", Flood: "🌊", Accident: "🚗", Medical: "🏥", Earthquake: "🌍", Storm: "⛈️", Other: "⚠️" };
  return icons[type] || "⚠️";
}

export default App;
