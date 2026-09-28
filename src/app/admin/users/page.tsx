import type { Metadata } from "next";
import { Users } from "@/components/admin/users";
import { getCurrentUser } from "@/lib/backend";

export const metadata: Metadata = {
  title: "Users",
  description: "Create accounts, change roles, reset usage and remove users.",
};

export default async function AdminUsersPage() {
  // The layout has already confirmed an admin is signed in.
  const me = await getCurrentUser();
  return <Users currentUserId={me?.user_id ?? ""} />;
}
