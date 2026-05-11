"use client";

import { useState, useRef } from "react";

const SEVERITY_CONFIG = {
  Minor: { color: "#3b82f6", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.3)" },
  Medium: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)" },
  Major: { color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)" },
  Illegal: { color: "#dc2626", bg: "rgba(220,38,38,0.15)", border: "rgba(220,38,38,0.5)" },
};

const URGENCY_CONFIG = {
  LOW: { color: "#10b981", label: "LOW RISK", pulse: false },
  MEDIUM: { color: "#f59e0b", label: "REVIEW NEEDED", pulse: true, pulseClass: "pulse-amber" },
  HIGH: { color: "#ef4444", label: "HIGH RISK", pulse: true, pulseClass: "pulse-red" },
};

export default function Home() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message || "Something went wrong. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  const urgency = result ? URGENCY_CONFIG[result.urgency] || URGENCY_CONFIG.LOW : null;

  return (
    <main style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
      {/* Header */}
      <header style={{
        borderBottom: "1px solid var(--border)",
        padding: "20px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backdropFilter: "blur(8px)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(8,12,20,0.9)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Shaft */}
            <line x1="6" y1="30" x2="28" y2="8" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
            {/* Tip */}
            <path d="M28 8 L22 10 L26 14 Z" fill="#f59e0b"/>
            {/* Barb */}
            <path d="M24 12 L19 14 L22 17" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            {/* Rope coil at base */}
            <path d="M6 30 Q4 28 7 26 Q10 24 8 22" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
          </svg>          <span style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
          }}>HARPOON</span>
          <span className="mono" style={{
            fontSize: 11,
            color: "var(--text-dim)",
            letterSpacing: "0.15em",
            marginLeft: 4,
            paddingTop: 2,
          }}>v0.1 — FINANCIAL THREAT SCANNER</span>
        </div>
        {result && (
          <button onClick={reset} style={{
            background: "transparent",
            border: "1px solid var(--border-bright)",
            color: "var(--text-secondary)",
            padding: "8px 16px",
            cursor: "pointer",
            fontSize: 13,
            fontFamily: "inherit",
            fontWeight: 600,
            letterSpacing: "0.05em",
            transition: "all 0.2s",
          }}
            onMouseEnter={e => { e.target.style.borderColor = "var(--accent-amber)"; e.target.style.color = "var(--accent-amber)"; }}
            onMouseLeave={e => { e.target.style.borderColor = "var(--border-bright)"; e.target.style.color = "var(--text-secondary)"; }}
          >
            ← SCAN NEW DOCUMENT
          </button>
        )}
      </header>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>

        {/* Hero */}
        {!result && !loading && (
          <div className="animate-fade-in-up" style={{ textAlign: "center", marginBottom: 48 }}>
            <h1 style={{
              fontSize: "clamp(36px, 6vw, 64px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              marginBottom: 16,
            }}>
              Go Fishing<br />
            </h1>
            <p style={{
              fontSize: 18,
              color: "var(--text-secondary)",
              maxWidth: 520,
              margin: "0 auto",
              lineHeight: 1.6,
            }}>
              Upload any financial document — loan agreement, medical bill, debt collection letter — and Harpoon will tell you exactly what to watch out for.
            </p>
          </div>
        )}

        {/* Upload Zone */}
        {!result && (
          <div
            className="animate-fade-in-up"
            style={{ animationDelay: "0.1s", opacity: 0 }}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => !file && fileInputRef.current?.click()}
          >
            <div style={{
              border: `2px dashed ${dragOver ? "var(--accent-amber)" : file ? "var(--accent-green)" : "var(--border-bright)"}`,
              borderRadius: 2,
              padding: "48px 32px",
              textAlign: "center",
              cursor: file ? "default" : "pointer",
              transition: "all 0.3s",
              background: dragOver ? "rgba(245,158,11,0.05)" : file ? "rgba(16,185,129,0.05)" : "var(--bg-secondary)",
              position: "relative",
              overflow: "hidden",
            }}>
{/* Crosshair SVG */}
<div style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                opacity: file ? 0.15 : dragOver ? 0.6 : 0.25,
                transition: "opacity 0.3s",
              }}>
                <svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Outer circle */}
                  <circle cx="90" cy="90" r="72" stroke={dragOver ? "#f59e0b" : "#94a3b8"} strokeWidth="1.5"/>
                  {/* Inner circle */}
                  <circle cx="90" cy="90" r="8" stroke={dragOver ? "#f59e0b" : "#94a3b8"} strokeWidth="1.5" fill="none"/>
                  {/* Center dot */}
                  <circle cx="90" cy="90" r="2" fill={dragOver ? "#f59e0b" : "#94a3b8"}/>
                  {/* Top line with ticks */}
                  <line x1="90" y1="18" x2="90" y2="82" stroke={dragOver ? "#f59e0b" : "#94a3b8"} strokeWidth="1.5"/>
                  <line x1="83" y1="30" x2="97" y2="30" stroke={dragOver ? "#f59e0b" : "#94a3b8"} strokeWidth="1"/>
                  <line x1="86" y1="42" x2="94" y2="42" stroke={dragOver ? "#f59e0b" : "#94a3b8"} strokeWidth="1"/>
                  <line x1="86" y1="54" x2="94" y2="54" stroke={dragOver ? "#f59e0b" : "#94a3b8"} strokeWidth="1"/>
                  <line x1="86" y1="66" x2="94" y2="66" stroke={dragOver ? "#f59e0b" : "#94a3b8"} strokeWidth="1"/>
                  {/* Bottom line with ticks */}
                  <line x1="90" y1="98" x2="90" y2="162" stroke={dragOver ? "#f59e0b" : "#94a3b8"} strokeWidth="1.5"/>
                  <line x1="83" y1="150" x2="97" y2="150" stroke={dragOver ? "#f59e0b" : "#94a3b8"} strokeWidth="1"/>
                  <line x1="86" y1="138" x2="94" y2="138" stroke={dragOver ? "#f59e0b" : "#94a3b8"} strokeWidth="1"/>
                  <line x1="86" y1="126" x2="94" y2="126" stroke={dragOver ? "#f59e0b" : "#94a3b8"} strokeWidth="1"/>
                  <line x1="86" y1="114" x2="94" y2="114" stroke={dragOver ? "#f59e0b" : "#94a3b8"} strokeWidth="1"/>
                  {/* Left line with ticks */}
                  <line x1="18" y1="90" x2="82" y2="90" stroke={dragOver ? "#f59e0b" : "#94a3b8"} strokeWidth="1.5"/>
                  <line x1="30" y1="83" x2="30" y2="97" stroke={dragOver ? "#f59e0b" : "#94a3b8"} strokeWidth="1"/>
                  <line x1="42" y1="86" x2="42" y2="94" stroke={dragOver ? "#f59e0b" : "#94a3b8"} strokeWidth="1"/>
                  <line x1="54" y1="86" x2="54" y2="94" stroke={dragOver ? "#f59e0b" : "#94a3b8"} strokeWidth="1"/>
                  <line x1="66" y1="86" x2="66" y2="94" stroke={dragOver ? "#f59e0b" : "#94a3b8"} strokeWidth="1"/>
                  {/* Right line with ticks */}
                  <line x1="98" y1="90" x2="162" y2="90" stroke={dragOver ? "#f59e0b" : "#94a3b8"} strokeWidth="1.5"/>
                  <line x1="150" y1="83" x2="150" y2="97" stroke={dragOver ? "#f59e0b" : "#94a3b8"} strokeWidth="1"/>
                  <line x1="138" y1="86" x2="138" y2="94" stroke={dragOver ? "#f59e0b" : "#94a3b8"} strokeWidth="1"/>
                  <line x1="126" y1="86" x2="126" y2="94" stroke={dragOver ? "#f59e0b" : "#94a3b8"} strokeWidth="1"/>
                  <line x1="114" y1="86" x2="114" y2="94" stroke={dragOver ? "#f59e0b" : "#94a3b8"} strokeWidth="1"/>
                </svg>
              </div>
              {preview ? (
                <div>
                  <img src={preview} alt="Document preview" style={{
                    maxHeight: 200, maxWidth: "100%",
                    margin: "0 auto 16px",
                    display: "block",
                    opacity: 0.8,
                    border: "1px solid var(--border)",
                  }} />
                  <p style={{ color: "var(--accent-green)", fontWeight: 600, fontSize: 14, letterSpacing: "0.05em" }}>
                    ✓ {file.name}
                  </p>
                  <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    style={{
                      marginTop: 12,
                      background: "transparent",
                      border: "none",
                      color: "var(--text-dim)",
                      cursor: "pointer",
                      fontSize: 13,
                      fontFamily: "inherit",
                      textDecoration: "underline",
                    }}>
                    change file
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.4 }}>⬆</div>
                  <p style={{ color: "var(--text-secondary)", fontSize: 16, marginBottom: 8 }}>
                    Drop your document here or <span style={{ color: "var(--accent-amber)", textDecoration: "underline" }}>browse</span>
                  </p>
                  <p className="mono" style={{ color: "var(--text-dim)", fontSize: 12, letterSpacing: "0.1em" }}>
                    JPG · PNG · PDF · WEBP
                  </p>
                </div>
              )}
            </div>

            <input ref={fileInputRef} type="file" accept="image/*,application/pdf"
              style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />

            {file && !loading && (
              <button onClick={handleAnalyze} style={{
                marginTop: 16,
                width: "100%",
                padding: "16px",
                background: "var(--accent-amber)",
                color: "#000",
                border: "none",
                cursor: "pointer",
                fontSize: 15,
                fontWeight: 700,
                fontFamily: "inherit",
                letterSpacing: "0.1em",
                transition: "all 0.2s",
              }}
                onMouseEnter={e => e.target.style.background = "#d97706"}
                onMouseLeave={e => e.target.style.background = "var(--accent-amber)"}
              >
                ANALYZE DOCUMENT →
              </button>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="animate-fade-in" style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ position: "relative", display: "inline-block", marginBottom: 32 }}>
              <div style={{
                width: 64, height: 64,
                border: "2px solid var(--border)",
                borderTopColor: "var(--accent-amber)",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }} />
            </div>
            <p className="mono" style={{ color: "var(--accent-amber)", letterSpacing: "0.15em", fontSize: 13 }}>
              SCANNING DOCUMENT...
            </p>
            <p style={{ color: "var(--text-dim)", fontSize: 14, marginTop: 8 }}>
              Harpoon is reading the fine print so you don't have to
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="animate-fade-in-up" style={{
            marginTop: 24,
            padding: "16px 20px",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#ef4444",
            fontSize: 14,
            fontFamily: "Space Mono, monospace",
          }}>
            ERROR: {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Urgency Banner */}
            <div className="animate-fade-in-up" style={{
              padding: "20px 24px",
              background: `${urgency.color}18`,
              border: `1px solid ${urgency.color}50`,
              borderLeft: `4px solid ${urgency.color}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className={urgency.pulse ? urgency.pulseClass : ""} style={{
                  width: 12, height: 12, borderRadius: "50%",
                  background: urgency.color, flexShrink: 0,
                }} />
                <span className="mono" style={{ color: urgency.color, fontWeight: 700, letterSpacing: "0.1em", fontSize: 14 }}>
                  {urgency.label}
                </span>
              </div>
              <span className="mono" style={{ color: "var(--text-dim)", fontSize: 11, letterSpacing: "0.1em" }}>
                {result.document_type}
              </span>
            </div>

            {/* Summary */}
            <div className="animate-fade-in-up" style={{
              padding: "24px",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
            }}>
              <label className="mono" style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: "0.15em", display: "block", marginBottom: 10 }}>
                SUMMARY
              </label>
              <p style={{ color: "var(--text-primary)", lineHeight: 1.7, fontSize: 15 }}>
                {result.summary}
              </p>
            </div>

            {/* Loan Details */}
            {result.loan_details && (
              <div className="animate-fade-in-up" style={{
                padding: "20px 24px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                display: "flex",
                gap: 32,
                flexWrap: "wrap",
              }}>
                <label className="mono" style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: "0.15em", width: "100%", marginBottom: 4 }}>
                  LOAN DETAILS
                </label>
                {result.loan_details.lender && (
                  <div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.1em", marginBottom: 4 }}>LENDER</div>
                    <div style={{ color: "var(--text-primary)", fontWeight: 600 }}>{result.loan_details.lender}</div>
                  </div>
                )}
                {result.loan_details.loan_type && (
                  <div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.1em", marginBottom: 4 }}>TYPE</div>
                    <div style={{ color: "var(--text-primary)", fontWeight: 600 }}>{result.loan_details.loan_type}</div>
                  </div>
                )}
                {result.loan_details.apr && (
                  <div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.1em", marginBottom: 4 }}>APR</div>
                    <div style={{ color: "var(--accent-red)", fontWeight: 700, fontSize: 20 }}>{result.loan_details.apr}</div>
                  </div>
                )}
              </div>
            )}

            {/* Red Flags */}
            {result.red_flags?.length > 0 && (
              <div className="animate-fade-in-up">
                <label className="mono" style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: "0.15em", display: "block", marginBottom: 10 }}>
                  RED FLAGS — {result.red_flags.length} FOUND
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {result.red_flags.map((flag, i) => {
                    const sev = SEVERITY_CONFIG[flag.category] || SEVERITY_CONFIG.Minor;
                    return (
                      <div key={i} style={{
                        padding: "16px 20px",
                        background: sev.bg,
                        border: `1px solid ${sev.border}`,
                        borderLeft: `3px solid ${sev.color}`,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>
                            {flag.issue || flag.what || flag.name || "Red Flag"}
                          </span>
                          <span className="mono" style={{
                            fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
                            color: sev.color, padding: "3px 8px",
                            border: `1px solid ${sev.border}`,
                            flexShrink: 0, marginLeft: 12,
                          }}>
                            {flag.category?.toUpperCase()}
                          </span>
                        </div>
                        {(flag.why || flag.harm || flag.explanation) && (
                          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6, marginBottom: flag.impact ? 8 : 0 }}>
                            {flag.why || flag.harm || flag.explanation}
                          </p>
                        )}
                        {flag.impact && (
                          <p className="mono" style={{ color: sev.color, fontSize: 12, marginTop: 6 }}>
                            IMPACT: {flag.impact}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Your Rights */}
            {result.your_rights && (
              <div className="animate-fade-in-up" style={{
                padding: "24px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
              }}>
                <label className="mono" style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: "0.15em", display: "block", marginBottom: 10 }}>
                  YOUR RIGHTS
                </label>
                <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: 14, whiteSpace: "pre-line" }}>
                  {result.your_rights}
                </p>
              </div>
            )}

            {/* Action Steps */}
            {result.action_steps?.length > 0 && (
              <div className="animate-fade-in-up" style={{
                padding: "24px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
              }}>
                <label className="mono" style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: "0.15em", display: "block", marginBottom: 16 }}>
                  ACTION STEPS
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {result.action_steps.map((step, i) => (
                    <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                      <span className="mono" style={{
                        color: "var(--accent-amber)", fontWeight: 700, fontSize: 13,
                        flexShrink: 0, paddingTop: 2,
                      }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6 }}>
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alternatives */}
            {result.alternatives?.sources?.length > 0 && (
              <div className="animate-fade-in-up" style={{
                padding: "24px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderTop: "2px solid var(--accent-amber)",
              }}>
                <label className="mono" style={{ fontSize: 11, color: "var(--accent-amber)", letterSpacing: "0.15em", display: "block", marginBottom: 10 }}>
                  ↗ BETTER OPTIONS FOUND
                </label>
                {result.alternatives.search_summary && (
                  <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                    {result.alternatives.search_summary}
                  </p>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {result.alternatives.sources.map((s, i) => (
                    <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" style={{
                      padding: "12px 16px",
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border)",
                      display: "block",
                      textDecoration: "none",
                      transition: "border-color 0.2s",
                    }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent-amber)"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
                    >
                      <div style={{ color: "var(--accent-amber)", fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                        {s.title}
                      </div>
                      <div style={{ color: "var(--text-dim)", fontSize: 12, lineHeight: 1.5 }}>
                        {s.summary}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Footer note */}
            <div className="animate-fade-in-up" style={{ padding: "16px", textAlign: "center" }}>
              <p className="mono" style={{ color: "var(--text-dim)", fontSize: 11, letterSpacing: "0.1em" }}>
                HARPOON IS NOT LEGAL ADVICE — CONSULT A PROFESSIONAL FOR YOUR SPECIFIC SITUATION
              </p>
            </div>

          </div>
        )}
      </div>
    </main>
  );
}