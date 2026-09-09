import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { api } from "../api";
import type { User } from "../types";

type NetworkState = "online" | "offline" | "reconnected";

export function NetworkStatus() {
  const [status, setStatus] = useState<NetworkState>(() =>
    navigator.onLine ? "online" : "offline",
  );

  useEffect(() => {
    const handleOffline = () => setStatus("offline");
    const handleOnline = () =>
      setStatus((current) =>
        current === "offline" ? "reconnected" : "online",
      );
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  useEffect(() => {
    if (status !== "reconnected") return;
    const timeout = window.setTimeout(() => setStatus("online"), 4_000);
    return () => window.clearTimeout(timeout);
  }, [status]);

  if (status === "online") return null;
  return (
    <div
      className={`network-status network-status--${status}`}
      role="status"
      aria-live="polite"
    >
      <span className="network-status__dot" aria-hidden="true" />
      {status === "offline"
        ? "You’re offline. Changes cannot be saved until you reconnect."
        : "Back online. Data will refresh automatically."}
    </div>
  );
}

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
      <NetworkStatus />
      <main id="main-content" className="page" tabIndex={-1}>
        <Outlet />
      </main>
    </>
  );
}
