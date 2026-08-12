import { describe, expect, it } from "vitest";

import { fetchAll } from "@/lib/supabase/fetch-all";

/** Simulates PostgREST range() paging over `total` rows, where the server
 *  caps every response at `serverCap` rows (Supabase default: 1000). */
function fakeServer(total: number, serverCap: number) {
  const calls: Array<[number, number]> = [];
  const page = (from: number, to: number) => {
    calls.push([from, to]);
    const requested = Math.min(to, total - 1) - from + 1;
    const count = Math.max(0, Math.min(requested, serverCap));
    const data = Array.from({ length: count }, (_, i) => from + i);
    return Promise.resolve({ data, error: null });
  };
  return { page, calls };
}

describe("fetchAll", () => {
  it("returns everything below one page (plus the confirming empty request)", async () => {
    // Stopping on a short page would misread a low server cap as end-of-data,
    // so the helper always confirms with one empty page.
    const server = fakeServer(3, 1000);
    const { data, error } = await fetchAll(server.page);
    expect(error).toBeNull();
    expect(data).toEqual([0, 1, 2]);
    expect(server.calls).toHaveLength(2);
  });

  it("pages past the server cap until an empty page", async () => {
    const server = fakeServer(2500, 1000);
    const { data, error } = await fetchAll(server.page);
    expect(error).toBeNull();
    expect(data).toHaveLength(2500);
    expect(data?.[2499]).toBe(2499);
  });

  it("does not truncate when the server cap is smaller than the page size", async () => {
    // A short page must not be read as end-of-data — only an empty one.
    const server = fakeServer(250, 100);
    const { data } = await fetchAll(server.page);
    expect(data).toHaveLength(250);
  });

  it("handles an exact page-size multiple (one extra empty request)", async () => {
    const server = fakeServer(1000, 1000);
    const { data } = await fetchAll(server.page);
    expect(data).toHaveLength(1000);
    expect(server.calls).toHaveLength(2);
  });

  it("returns empty data for an empty table", async () => {
    const server = fakeServer(0, 1000);
    const { data, error } = await fetchAll(server.page);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("propagates errors and returns null data", async () => {
    const { data, error } = await fetchAll(() =>
      Promise.resolve({ data: null, error: { message: "boom" } }),
    );
    expect(error).toEqual({ message: "boom" });
    expect(data).toBeNull();
  });
});
