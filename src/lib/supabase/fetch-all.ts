// PostgREST silently caps every response at the server's max-rows setting
// (Supabase default: 1000) — no error, just missing rows. Any query that can
// grow past that (cell_values, items, …) must page through with range().
//
// The loop stops on the first EMPTY page rather than the first short one:
// a short page could just mean the server's cap is lower than our page size,
// so stopping there would silently truncate again. Callers MUST give the
// query a stable order() (e.g. the primary key) — heap order shifts between
// requests, which makes unordered pages overlap or skip rows.

const PAGE_SIZE = 1000;

interface PageResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<PageResult<T>> {
  const all: T[] = [];
  for (let from = 0; ; ) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) return { data: null, error };
    const rows = data ?? [];
    if (rows.length === 0) return { data: all, error: null };
    all.push(...rows);
    from += rows.length;
  }
}
