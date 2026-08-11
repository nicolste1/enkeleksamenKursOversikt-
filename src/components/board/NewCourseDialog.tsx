"use client";

import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createCourseAction } from "@/lib/boards/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Oppretter …" : "Opprett kurs"}
    </Button>
  );
}

/** «Nytt kurs» — visible to every workspace member (FR4); the new course gets
 *  the standard columns, statuses and functions from the template (F7).
 *  `compact` renders a small «+» icon trigger for the sidebar. */
export function NewCourseDialog({
  workspaceId,
  compact = false,
}: {
  workspaceId: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {compact ? (
        <DialogTrigger
          render={
            <Button size="icon-xs" variant="ghost" aria-label="Nytt kurs" />
          }
        >
          <PlusIcon />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button size="sm" variant="outline" />}>
          Nytt kurs
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nytt kurs</DialogTitle>
          <DialogDescription>
            Kurset opprettes fra standardmalen med alle produksjonskolonnene.
          </DialogDescription>
        </DialogHeader>
        <form action={createCourseAction} className="grid gap-3">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <Input
            name="name"
            placeholder="F.eks. «NTNU - Matematikk 1 - Kalkulus»"
            required
            autoFocus
            maxLength={200}
          />
          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
