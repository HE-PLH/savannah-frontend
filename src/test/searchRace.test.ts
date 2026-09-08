import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { api } from "../api";

test("requests a one-minute session when signing in", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        id: 1,
        username: "ward.user",
        firstName: "Ward",
        lastName: "User",
        email: "ward.user@example.com",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    ),
  );

  await api.login("ward.user", "physical-count-pass");

  expect(fetchMock).toHaveBeenCalledWith(
    "http://localhost:8000/api/auth/login",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        username: "ward.user",
        password: "physical-count-pass",
        expiresInMins: 1,
      }),
    }),
  );
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test("cancels an obsolete search and never publishes its result as current", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const oldResult = deferred<string>();
  const newResult = deferred<string>();
  let oldSignal: AbortSignal | undefined;
  const queryFn = ({
    queryKey,
    signal,
  }: {
    queryKey: readonly unknown[];
    signal: AbortSignal;
  }) => {
    const query = queryKey[1];
    if (query === "old") oldSignal = signal;
    return query === "old" ? oldResult.promise : newResult.promise;
  };
  const observer = new QueryObserver(client, {
    queryKey: ["search", "old"],
    queryFn,
  });
  const seen: Array<string | undefined> = [];
  const unsubscribe = observer.subscribe((result) => seen.push(result.data));

  observer.setOptions({ queryKey: ["search", "new"], queryFn });
  expect(oldSignal?.aborted).toBe(true);
  oldResult.resolve("obsolete");
  newResult.resolve("current");
  await newResult.promise;
  await Promise.resolve();

  expect(observer.getCurrentResult().data).toBe("current");
  expect(seen).not.toContain("obsolete");
  unsubscribe();
});
