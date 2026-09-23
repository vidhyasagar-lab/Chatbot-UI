import { Users } from "@/components/admin/users";
import { getCurrentUser } from "@/lib/backend";

export default async function AdminUsersPage() {
  // The layout has already confirmed an admin is signed in.
  const me = await getCurrentUser();
  return <Users currentUserId={me?.user_id ?? ""} />;
}
