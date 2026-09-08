import { useQueryClient } from "@tanstack/react-query";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { api } from "../api";
import type { User } from "../types";

export function AppShell({ user }: { user: User }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const signOut = async () => {
    try {
      await api.logout();
    } finally {
      queryClient.clear();
      await navigate("/signin", { replace: true });
    }
  };

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="masthead">
        <div className="masthead__inner">
          <NavLink className="brand" to="/">
            Clinic stock
          </NavLink>
          <div className="account">
            <span className="account__name">
              {user.firstName} {user.lastName}
            </span>
            <button
              className="button button--ghost"
              type="button"
              onClick={signOut}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main id="main-content" className="page" tabIndex={-1}>
        <Outlet />
      </main>
    </>
  );
}
