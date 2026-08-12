import Link from "next/link";
import { notFound } from "next/navigation";

import { BoardHeader } from "@/components/board/BoardHeader";
import { BoardProvider } from "@/components/board/board-store";
import { BoardTable } from "@/components/board/BoardTable";
import { getBoardData } from "@/lib/boards/queries";
import { getSavedViews } from "@/lib/views/queries";

// Board page (M4: editable). The Server Component fetches the full read
// model; the client-side store owns it from there with optimistic updates.
// RLS decides access — no board (or no access) renders the same 404.
export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  const [board, savedViews] = await Promise.all([
    getBoardData(boardId),
    getSavedViews(boardId),
  ]);
  if (!board) notFound();

  return (
    <BoardProvider initial={board}>
      {/* Full-height column: the table below takes whatever is left, so the
          lesson list reaches the bottom of the viewport. */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 pt-6">
        <div>
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground text-sm underline"
          >
            ← Kursoversikt
          </Link>
          <div className="mt-1">
            <BoardHeader />
          </div>
        </div>
        <BoardTable savedViews={savedViews} />
      </div>
    </BoardProvider>
  );
}
