"use client";
import { UserProfileView } from "@/components/UserProfileView";
import { useAuth } from "@/lib/auth-context";

export default function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;
  return <UserProfileView userId={user.id} isSelf={true} />;
}
