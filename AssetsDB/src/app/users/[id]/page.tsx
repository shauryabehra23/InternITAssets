"use client";
import { useParams } from "next/navigation";
import { UserProfileView } from "@/components/UserProfileView";
import { useAuth } from "@/lib/auth-context";

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  return <UserProfileView userId={id} isSelf={user?.id === id} />;
}
