"use client";

import { PencilSimple, Trash } from "@phosphor-icons/react";
import { useMemo, useRef, useState } from "react";
import { groupSessions } from "@/lib/sessions";
import { cn } from "@/lib/utils";
import type { SessionsState } from "./use-sessions";

type Props = {
  state: SessionsState;
  activeId: string;
  onOpen: (sessionId: string) => void;
  onDeleted: (sessionId: string) => void;
};

/** Past chats, newest first, grouped by when they were last used. */
export function HistoryList({ state, activeId, onOpen, onDeleted }: Props) {
  const groups = useMemo(() => groupSessions(state.sessions ?? []), [state.sessions]);

  if (state.sessions === null) {
    return <p className="px-3 text-[12.5px] text-faint">Loading chats…</p>;
  }
  if (state.sessions.length === 0) {
    return <p className="px-3 text-[12.5px] leading-relaxed text-faint">Your chats will appear here.</p>;
  }

  return (
    <nav aria-label="Chat history" className="flex flex-col gap-4">
      {state.error && (
        <p role="alert" className="px-3 text-[12px] text-err">
          {state.error}
        </p>
      )}
      {groups.map((g) => (
        <section key={g.label} className="flex flex-col gap-0.5">
          <h3 className="px-3 pb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-faint">{g.label}</h3>
          <ul className="flex flex-col gap-0.5">
            {g.sessions.map((s) => (
              <HistoryItem
                key={s.session_id}
                title={s.title}
                active={s.session_id === activeId}
                onOpen={() => onOpen(s.session_id)}
                onDelete={async () => {
                  // Only leave the open chat once it is really gone.
                  if (await state.remove(s.session_id)) onDeleted(s.session_id);
                }}
                onRename={(t) => state.rename(s.session_id, t)}
              />
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}

function HistoryItem({
  title,
  active,
  onOpen,
  onDelete,
  onRename,
}: {
  title: string;
  active: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const ended = useRef(false);
  const startEditing = () => {
    ended.current = false;
    setEditing(true);
  };

  if (editing) {
    // Enter and Escape unmount the input, which then blurs: only the first ending counts.
    const finish = (save: boolean, value: string) => {
      if (ended.current) return;
      ended.current = true;
      setEditing(false);
      if (save) onRename(value);
    };
    return (
      <li>
        <input
          autoFocus
          defaultValue={title}
          maxLength={200}
          aria-label="Chat name"
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={(e) => {
            if (e.key === "Enter") finish(true, e.currentTarget.value);
            if (e.key === "Escape") finish(false, "");
          }}
          onBlur={(e) => finish(true, e.currentTarget.value)}
          className="block w-full rounded-lg border border-brand bg-core px-3 py-1 text-[13.5px] outline-none shadow-[0_0_0_3px_var(--brand-soft)]"
        />
      </li>
    );
  }

  if (confirming) {
    return (
      <li className="flex items-center gap-1 rounded-lg bg-err-soft px-3 py-1.5 text-[12.5px]">
        <span className="min-w-0 flex-1 truncate text-err">Delete this chat?</span>
        <button
          type="button"
          autoFocus
          onClick={onDelete}
          className="rounded-md px-2 py-0.5 font-medium text-err transition-colors hover:bg-err-soft"
        >
          Delete
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-md px-2 py-0.5 text-muted-foreground transition-colors hover:bg-shell"
        >
          Keep
        </button>
      </li>
    );
  }

  return (
    <li className="group relative">
      <button
        type="button"
        onClick={onOpen}
        aria-current={active ? "page" : undefined}
        title={title}
        className={cn(
          "block w-full truncate rounded-lg py-1.5 pl-3 pr-3 text-left text-[13.5px] transition-[color,background-color,padding] group-focus-within:pr-16 group-hover:pr-16",
          active ? "bg-core font-medium text-foreground shadow-[0_0_0_1px_var(--hair)]" : "text-muted-foreground hover:bg-shell hover:text-foreground",
        )}
      >
        {title || "Untitled chat"}
      </button>
      {/* Hidden until hover or keyboard focus; always reachable by Tab. */}
      <span className="absolute right-1 top-1/2 flex -translate-y-1/2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100">
        <button
          type="button"
          onClick={startEditing}
          aria-label={`Rename chat: ${title}`}
          title="Rename chat"
          className="grid size-7 place-items-center rounded-md text-faint transition-colors hover:text-foreground"
        >
          <PencilSimple weight="regular" className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Delete chat: ${title}`}
          title="Delete chat"
          className="grid size-7 place-items-center rounded-md text-faint transition-colors hover:text-err"
        >
          <Trash weight="regular" className="size-3.5" />
        </button>
      </span>
    </li>
  );
}
