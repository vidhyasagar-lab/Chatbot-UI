"use client";

import { Plus, Trash, X } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { type AdminUser, formatNumber, formatWhen } from "@/lib/admin";
import { cn } from "@/lib/utils";
import { adminJson, useAdminData } from "./admin-api";
import { Badge, Button, ConfirmButton, Empty, ErrorNote, Field, Loading, PageHeader, Panel, PanelHeader } from "./ui";

export function Users({ currentUserId }: { currentUserId: string }) {
  const users = useAdminData<AdminUser[]>("/users");
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await fn();
      await users.reload();
    } catch (e) {
      setActionError((e as Error).message);
    }
  };

  const admins = users.data?.filter((u) => u.role === "admin").length ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Admin · Users"
        title="People with access"
        description="Create accounts, decide who can administer Verity, and remove people who no longer need it. Deleting a user also removes their documents."
        actions={
          !creating && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus weight="bold" />
              New user
            </Button>
          )
        }
      />

      {creating && (
        <CreateUser
          onCancel={() => setCreating(false)}
          onCreated={async () => {
            setCreating(false);
            await users.reload();
          }}
        />
      )}

      {actionError && <ErrorNote message={actionError} />}

      <Panel className="animate-rise overflow-hidden">
        <PanelHeader
          title="All users"
          meta={users.data ? `${users.data.length} total · ${admins} admin${admins === 1 ? "" : "s"}` : undefined}
        />
        {users.loading ? (
          <Loading />
        ) : users.error ? (
          <div className="p-5">
            <ErrorNote message={users.error} onRetry={users.reload} />
          </div>
        ) : !users.data?.length ? (
          <Empty title="No users yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-hair text-[11.5px] uppercase tracking-[0.1em] text-faint">
                  <th className="px-5 py-2.5 font-medium">User</th>
                  <th className="px-3 py-2.5 font-medium">Role</th>
                  <th className="px-3 py-2.5 font-medium">Documents</th>
                  <th className="px-3 py-2.5 font-medium">Joined</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {users.data.map((u) => {
                  const me = u.user_id === currentUserId;
                  return (
                    <tr key={u.user_id} className="border-b border-hair last:border-0 transition-colors hover:bg-shell">
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-3">
                          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-mark font-serif text-[13px] font-medium uppercase text-mark-ink">
                            {u.username.slice(0, 2)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{u.username}</span>
                            {me && <span className="text-[12px] text-faint">You</span>}
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {me ? (
                          <Badge tone="brand">admin</Badge>
                        ) : (
                          <RoleSwitch
                            role={u.role}
                            onChange={(role) =>
                              run(() => adminJson(`/users/${encodeURIComponent(u.user_id)}/role`, { method: "PATCH", body: { role } }))
                            }
                          />
                        )}
                      </td>
                      <td className="px-3 py-3 font-mono text-[13px] text-muted-foreground">
                        {formatNumber(u.doc_count)}
                        <span className="text-faint"> · {formatNumber(u.total_chunks)} chunks</span>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{formatWhen(u.created_at)}</td>
                      <td className="px-5 py-3 text-right">
                        {!me && (
                          <ConfirmButton
                            compact
                            label={`Delete ${u.username}`}
                            question={`Delete ${u.username}?`}
                            confirmLabel="Delete"
                            icon={<Trash weight="regular" />}
                            onConfirm={() => run(() => adminJson(`/users/${encodeURIComponent(u.user_id)}`, { method: "DELETE" }))}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

/** Two-option segmented control; changing it saves straight away. */
function RoleSwitch({ role, onChange }: { role: string; onChange: (role: "user" | "admin") => void }) {
  return (
    <span role="radiogroup" aria-label="Role" className="inline-flex rounded-lg border border-hair bg-core-2 p-0.5">
      {(["user", "admin"] as const).map((r) => (
        <button
          key={r}
          type="button"
          role="radio"
          aria-checked={role === r}
          onClick={() => role !== r && onChange(r)}
          className={cn(
            "rounded-md px-2.5 py-1 text-[12.5px] capitalize transition-[background-color,color] duration-300 ease-spring",
            role === r ? "bg-core font-medium text-foreground shadow-[0_0_0_1px_var(--hair)]" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {r}
        </button>
      ))}
    </span>
  );
}

function CreateUser({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => void }) {
  const [role, setRole] = useState<"user" | "admin">("user");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const username = String(form.get("username") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!username || password.length < 8) {
      setError("Enter a username and a password of at least 8 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await adminJson("/users", { method: "POST", body: { username, password, role } });
      onCreated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel className="animate-rise">
      <PanelHeader
        title="New user"
        actions={
          <button type="button" onClick={onCancel} aria-label="Cancel" className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-shell">
            <X weight="regular" className="size-4" />
          </button>
        }
      />
      <form onSubmit={submit} className="grid grid-cols-[1fr_1fr_auto] items-end gap-4 p-5 max-md:grid-cols-1" noValidate>
        <Field label="Username" name="username" autoComplete="off" autoFocus hint="Letters, numbers, spaces, dots, dashes, underscores." />
        <Field label="Temporary password" name="password" type="password" autoComplete="new-password" hint="At least 8 characters. Share it privately." />
        <div className="flex flex-col gap-1.5 pb-[22px] max-md:pb-0">
          <span className="text-[13px] font-medium">Role</span>
          <RoleSwitch role={role} onChange={setRole} />
        </div>
        {error && (
          <p role="alert" className="text-[13px] text-err md:col-span-3">
            {error}
          </p>
        )}
        <div className="flex gap-2 md:col-span-3">
          <Button type="submit" variant="primary" busy={busy}>
            Create user
          </Button>
          <Button onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Panel>
  );
}
