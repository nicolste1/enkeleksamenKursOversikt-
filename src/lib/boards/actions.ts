"use server";

// Server actions bridging client components to the lib mutations. Keep them
// thin: validate input, call the mutation, refresh/navigate.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createBoardFromTemplate } from "@/lib/boards/mutations";
import { isUuid } from "@/lib/validation";

export async function createCourseAction(formData: FormData): Promise<void> {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  // Server-side limits — the client-side maxLength is advisory only.
  if (!isUuid(workspaceId)) throw new Error("Ugyldig workspace.");
  if (!name) throw new Error("Kurset må ha et navn.");
  if (name.length > 200) throw new Error("Kursnavnet er for langt (maks 200 tegn).");

  const boardId = await createBoardFromTemplate(workspaceId, name);
  revalidatePath("/");
  redirect(`/boards/${boardId}`);
}
