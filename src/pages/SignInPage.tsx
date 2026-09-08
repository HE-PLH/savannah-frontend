import { useState } from "react";
import { api, ApiError } from "../api";

export function SignInPage({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const username = data.get("username");
    const password = data.get("password");
    if (typeof username !== "string" || typeof password !== "string") return;
    setSubmitting(true);
    setError("");
    try {
      await api.csrf();
      await api.login(username, password);
      await onSuccess();
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : "Sign in could not be completed",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="signin">
      <section className="signin-panel" aria-labelledby="signin-title">
        <div className="signin-panel__inner">
          <header className="signin-brand" aria-label="Clinic stock">
            <span className="signin-brand__mark" aria-hidden="true">
              <span />
            </span>
            <span>Clinic stock</span>
          </header>

          <div className="signin-copy">
            <h1 id="signin-title">Sign in to clinic stock</h1>
            <p>Use your staff catalogue account.</p>
          </div>

          <form onSubmit={submit} aria-busy={submitting}>
            <div className="signin-field">
              <label htmlFor="username">
                Email or username <span aria-hidden="true">*</span>
              </label>
              <input
                id="username"
                name="username"
                autoComplete="username"
                placeholder="Enter your email or username"
                required
              />
            </div>
            <div className="signin-field">
              <label htmlFor="password">
                Password <span aria-hidden="true">*</span>
              </label>
              <div className="password-field">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button button--wide signin-submit"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="signin-help">
            Contact your stock administrator if you cannot access your account.
          </p>
        </div>
      </section>

      <aside
        className="signin-visual"
        aria-label="Reliable stock information for every ward"
      >
        <div className="signin-visual__wash" />
        <div className="signin-visual__content">
          <p className="signin-visual__kicker">Clinic inventory</p>
          <h2>Know what is available, wherever you are.</h2>
          <p>
            Search the catalogue, review item details, and keep physical counts
            accurate across the clinic.
          </p>
          <div className="stock-preview" aria-hidden="true">
            <div className="stock-preview__header">
              <span />
              <span />
              <span />
            </div>
            <div className="stock-preview__body">
              <div className="stock-preview__search" />
              <div className="stock-preview__rows">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}
