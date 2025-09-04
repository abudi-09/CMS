import UserProfileModal from "@/components/UserProfileModal";
import { useState } from "react";
import { Users } from "lucide-react";

export default function AdminProfile() {
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-2">Admin Profile</h1>
      <div className="pt-6">
        <button
          className="inline-flex items-center gap-2 px-4 py-2 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
          onClick={() => setProfileUserId("me")}
        >
          <Users className="h-5 w-5" /> View My Profile
        </button>
        <UserProfileModal
          userId={profileUserId || ""}
          open={!!profileUserId}
          onOpenChange={(o) => !o && setProfileUserId(null)}
        />
      </div>
    </div>
  );
}
