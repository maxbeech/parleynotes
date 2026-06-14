"use client";

import { useEffect, useState } from "react";
import { listMeetings, deleteMeeting, type Meeting } from "@/lib/db";

export default function SavedMeetings({ reloadFlag }: { reloadFlag: number }) {
  const [items, setItems] = useState<Meeting[]>([]);

  useEffect(() => {
    let live = true;
    listMeetings().then((m) => { if (live) setItems(m); }).catch(() => {});
    return () => { live = false; };
  }, [reloadFlag]);

  const remove = async (id: string) => {
    await deleteMeeting(id);
    setItems((cur) => cur.filter((m) => m.id !== id));
  };

  const exportOne = (m: Meeting) => {
    const blob = new Blob([m.notesMarkdown], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${m.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "meeting"}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (items.length === 0) return null;

  return (
    <div className="mt-5 border-t border-stone-200 pt-4">
      <h3 className="text-sm font-semibold text-stone-700">Saved on this device ({items.length})</h3>
      <ul className="mt-2 space-y-1.5">
        {items.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-2 rounded-lg bg-stone-50 px-3 py-2 text-sm">
            <span className="truncate">
              <span className="font-medium">{m.title}</span>
              <span className="ml-2 text-xs text-stone-400">{m.dateISO.slice(0, 10)}</span>
            </span>
            <span className="flex shrink-0 gap-2 text-xs">
              <button onClick={() => exportOne(m)} className="text-stone-500 hover:text-stone-900">.md</button>
              <button onClick={() => remove(m.id)} className="text-rose-500 hover:text-rose-700">delete</button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
