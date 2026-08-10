import { Button } from "@/components/ui/button";

// A plain form POST to the signout route — clears the session server-side and
// redirects, no client JS or full-page location assignment needed.
export function LogoutButton() {
  return (
    <form action="/auth/signout" method="post">
      <Button type="submit" variant="outline" size="sm">
        Logg ut
      </Button>
    </form>
  );
}
