/** Re-mounts per navigation so every page enters with a gentle rise. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page">{children}</div>;
}
