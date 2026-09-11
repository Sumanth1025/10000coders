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
        {/* PRIORITY DISTRIBUTION */}
<section className="priority-distribution-card">
  <div className="priority-distribution-header">
    <h2>Priority Distribution</h2>
    <span>Incidents by Priority Level</span>
  </div>

  {(() => {
    const priorityCounts = {
      P1: incidents.filter((i) => i.priority === "P1").length,
      P2: incidents.filter((i) => i.priority === "P2").length,
      P3: incidents.filter((i) => i.priority === "P3").length,
      P4: incidents.filter((i) => i.priority === "P4").length,
    };

    const total = incidents.length;

    const p1Percent = total
      ? (priorityCounts.P1 / total) * 100
      : 0;

    const p2Percent = total
      ? (priorityCounts.P2 / total) * 100
      : 0;

    const p3Percent = total
      ? (priorityCounts.P3 / total) * 100
      : 0;

    const p4Percent = total
      ? (priorityCounts.P4 / total) * 100
      : 0;

    return (
      <div className="priority-distribution-content">

        {/* DONUT */}
        <div className="priority-donut-section">

          <div
            className="priority-donut"
            style={{
              background: total
                ? `conic-gradient(
                    #ff304f 0% ${p1Percent}%,
                    #ffc400 ${p1Percent}% ${p1Percent + p2Percent}%,
                    #ff7900 ${p1Percent + p2Percent}% ${p1Percent + p2Percent + p3Percent}%,
                    #16d66b ${p1Percent + p2Percent + p3Percent}% 100%
                  )`
                : "#263b52",
            }}
          >
            <div className="priority-donut-center">
              <strong>{total}</strong>
              <span>Total</span>
              <span>Incidents</span>
            </div>
          </div>

          <div className="priority-legend">
            <div>
              <span className="legend-color p1"></span>
              P1
            </div>

            <div>
              <span className="legend-color p2"></span>
              P2
            </div>

            <div>
              <span className="legend-color p3"></span>
              P3
            </div>

            <div>
              <span className="legend-color p4"></span>
              P4
            </div>
          </div>

        </div>

        {/* PRIORITY ROWS */}
        <div className="priority-levels">

          {/* P1 */}
          <div className="priority-level p1">
            <div className="priority-badge">P1</div>

            <div className="priority-info">
              <strong>{priorityCounts.P1}</strong>
              <span>Critical</span>
            </div>

            <div className="priority-progress">
              <div
                className="priority-progress-fill"
                style={{ width: `${p1Percent}%` }}
              ></div>
            </div>

            <span className="priority-percent">
              {Math.round(p1Percent)}%
            </span>
          </div>

          {/* P2 */}
          <div className="priority-level p2">
            <div className="priority-badge">P2</div>

            <div className="priority-info">
              <strong>{priorityCounts.P2}</strong>
              <span>High</span>
            </div>

            <div className="priority-progress">
              <div
                className="priority-progress-fill"
                style={{ width: `${p2Percent}%` }}
              ></div>
            </div>

            <span className="priority-percent">
              {Math.round(p2Percent)}%
            </span>
          </div>

          {/* P3 */}
          <div className="priority-level p3">
            <div className="priority-badge">P3</div>

            <div className="priority-info">
              <strong>{priorityCounts.P3}</strong>
              <span>Medium</span>
            </div>

            <div className="priority-progress">
              <div
                className="priority-progress-fill"
                style={{ width: `${p3Percent}%` }}
              ></div>
            </div>

            <span className="priority-percent">
              {Math.round(p3Percent)}%
            </span>
          </div>

          {/* P4 */}
          <div className="priority-level p4">
            <div className="priority-badge">P4</div>

            <div className="priority-info">
              <strong>{priorityCounts.P4}</strong>
              <span>Low</span>
            </div>

            <div className="priority-progress">
              <div
                className="priority-progress-fill"
                style={{ width: `${p4Percent}%` }}
              ></div>
            </div>

            <span className="priority-percent">
              {Math.round(p4Percent)}%
            </span>
          </div>

        </div>
      </div>
    );
  })()}
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

      {/* INCIDENT HEADER */}

      <div className="selected-header">

        <div className="selected-icon">
          {getIncidentIcon(
            selectedIncident.incident_type
          )}
        </div>

        <div>
          <h3>
            {selectedIncident.incident_type}
          </h3>

          <p className="selected-location">
            📍 {selectedIncident.location}
          </p>
        </div>

      </div>


      {/* PRIORITY */}

      <div className="selected-priority">

        <div>
          <span
            className={`priority ${
              selectedIncident.priority?.toLowerCase()
            }`}
          >
            {selectedIncident.priority}
          </span>

          <span className="priority-text">
            Priority
          </span>
        </div>

        <strong>
          SCORE{" "}
          {Number(
            selectedIncident.priority_score || 0
          ).toFixed(0)}
        </strong>

      </div>


      {/* CORE INTELLIGENCE */}

      <div className="selected-stat-grid">

        <div>
          <span>Severity</span>
          <strong>
            {selectedIncident.severity}
          </strong>
        </div>

        <div>
          <span>Risk Score</span>
          <strong>
            {Number(
              selectedIncident.risk_score || 0
            ).toFixed(0)}
            /100
          </strong>
        </div>

        <div>
          <span>People</span>
          <strong>
            {selectedIncident.people_affected
              ? "Affected"
              : "None Reported"}
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

      </div>


      {/* AI FLAGS */}

      <div className="intelligence-flags">

        {selectedIncident.people_affected && (
          <div className="intel-flag">
            <span>👥</span>
            <div>
              <strong>People affected</strong>
              <small>Emergency impact reported</small>
            </div>
          </div>
        )}

        {selectedIncident.people_trapped && (
          <div className="intel-flag danger">
            <span>🚨</span>
            <div>
              <strong>People trapped</strong>
              <small>Immediate rescue attention</small>
            </div>
          </div>
        )}

        {selectedIncident.rescue_required && (
          <div className="intel-flag">
            <span>🚑</span>
            <div>
              <strong>Rescue required</strong>
              <small>Emergency intervention needed</small>
            </div>
          </div>
        )}

        {selectedIncident.road_blocked && (
          <div className="intel-flag warning">
            <span>🚧</span>
            <div>
              <strong>Road blocked</strong>
              <small>May affect emergency access</small>
            </div>
          </div>
        )}

      </div>


      {/* AI SUMMARY */}

      {selectedIncident.summary && (

        <div className="ai-summary">

          <div className="ai-summary-title">
            <span>🧠</span>
            AI Situation Summary
          </div>

          <p>
            {selectedIncident.summary}
          </p>

        </div>

      )}


      {/* RECOMMENDED ACTIONS */}

      {selectedIncident.recommended_actions?.length > 0 && (

        <div className="selected-actions">

          <h4>
            Recommended Actions
          </h4>

          <ul>

            {selectedIncident.recommended_actions
              .slice(0, 5)
              .map((action, index) => (

                <li key={index}>
                  <span>✓</span>
                  {action}
                </li>

              ))}

          </ul>

        </div>

      )}


      {/* RESPONSE CONTROL */}

      <div className="response-control">

        <div className="response-control-header">

          <h4>
            Response Status
          </h4>

          <span className="current-status">
            {selectedIncident.status}
          </span>

        </div>

        <select
          value={selectedIncident.status}
          onChange={(e) => {
            updateStatus(
              selectedIncident.id,
              e.target.value
            );

            setSelectedIncident({
              ...selectedIncident,
              status: e.target.value
            });
          }}
        >

          <option value="Reported">
            Reported
          </option>

          <option value="Analyzed">
            Analyzed
          </option>

          <option value="Dispatched">
            Dispatched
          </option>

          <option value="In Progress">
            In Progress
          </option>

          <option value="Resolved">
            Resolved
          </option>

          <option value="Closed">
            Closed
          </option>

        </select>

      </div>

    </div>

  ) : (

    <div className="no-selection">

      <div className="selection-icon">
        📍
      </div>

      <h3>
        Select an incident
      </h3>

      <p>
        Click a marker on the live map to inspect
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

  {incident.people_affected && (
    <span>
      👥 People affected
    </span>
  )}

  {incident.people_trapped && (
    <span className="danger-flag">
      🚨 People trapped
    </span>
  )}

  {incident.rescue_required && (
    <span>
      🚑 Rescue required
    </span>
  )}

  {incident.road_blocked && (
    <span className="warning-flag">
      🚧 Road blocked
    </span>
  )}

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
