"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#0B0F13", color: "#EDF2EE" }}>
        <div style={{ maxWidth: 420, margin: "120px auto", padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ marginTop: 12, fontSize: 14, color: "#8E99A1" }}>
            {error.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              padding: "10px 22px",
              borderRadius: 999,
              border: "none",
              background: "#C8F04D",
              color: "#151B06",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
