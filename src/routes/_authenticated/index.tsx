import { createFileRoute, redirect } from "@tanstack/react-router";

// The signed-in root — always send users to /dashboard so
// role-aware home lives at a named path.
export const Route = createFileRoute("/_authenticated/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});