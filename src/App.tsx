import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ApiError, api } from "./api";
import { AppShell } from "./components/AppShell";
import { ErrorState, LoadingState } from "./components/AsyncState";
import { ItemPage } from "./pages/ItemPage";
import { SignInPage } from "./pages/SignInPage";
import { StockPage } from "./pages/StockPage";

export function App() {
  const user = useQuery({
    queryKey: ["me"],
    queryFn: ({ signal }) => api.me({ signal }),
    retry: false,
  });
  const refetchUser = user.refetch;

  useEffect(() => {
    const handleExpiry = () => void refetchUser();
    window.addEventListener("clinic-auth-expired", handleExpiry);
    return () =>
      window.removeEventListener("clinic-auth-expired", handleExpiry);
  }, [refetchUser]);

  if (user.isPending) return <LoadingState label="Checking your session" />;
  if (
    user.isError &&
    user.error instanceof ApiError &&
    user.error.status === 401
  ) {
    return (
      <SignInPage
        onSuccess={async () => {
          await user.refetch();
        }}
      />
    );
  }
  if (user.isError) {
    return (
      <ErrorState
        message={user.error.message}
        onRetry={() => void user.refetch()}
      />
    );
  }

  return (
    <Routes>
      <Route element={<AppShell user={user.data} />}>
        <Route index element={<StockPage />} />
        <Route path="items/:id" element={<ItemPage />} />
        <Route path="signin" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
