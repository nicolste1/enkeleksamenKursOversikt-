// Protected home. A real course list (per workspace) arrives in M3; for now this
// just confirms the auth shell works end to end.
export default function HomePage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Kursoversikt</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Du er logget inn. Kurslisten kommer her.
      </p>
    </div>
  );
}
