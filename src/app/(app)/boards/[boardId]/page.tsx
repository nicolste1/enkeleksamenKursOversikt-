import Link from "next/link";
import { notFound } from "next/navigation";

import { BoardTable } from "@/components/board/BoardTable";
import { getBoardData } from "@/lib/boards/queries";

// Read-only board view (M3); editing arrives in M4. RLS decides access —
// no board (or no access) renders the same 404.
export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  const board = await getBoardData(boardId);
  if (!board) notFound();

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground text-sm underline"
        >
          ← Kursoversikt
        </Link>
        <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold">
          {board.name}
          {board.archivedAt && (
            <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-xs font-normal">
              Arkivert — skrivebeskyttet
            </span>
          )}
        </h1>
      </div>
      <BoardTable board={board} />
    </div>
  );
}
