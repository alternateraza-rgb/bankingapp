"use client";

import { MobileHeader } from "@/components/layout/mobile-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import { useState } from "react";
import { toast } from "sonner";

export default function PersonalInfoPage() {
  const user = useAppStore((s) => s.user);
  const updateUser = useAppStore((s) => s.updateUser);
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [phone, setPhone] = useState(user.phone);

  return (
    <div className="flex flex-1 flex-col">
      <MobileHeader title="Personal information" showBack backHref="/profile" />
      <main className="flex flex-1 flex-col gap-4 px-4 pb-8">
        <div className="space-y-3 rounded-[24px] bg-wise-surface p-4">
          <div>
            <Label htmlFor="first">First name</Label>
            <Input
              id="first"
              className="mt-1.5"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="last">Last name</Label>
            <Input
              id="last"
              className="mt-1.5"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" className="mt-1.5" value={user.email} readOnly />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              className="mt-1.5"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>
        <p className="text-xs text-wise-mute">
          Account plan: {user.plan}
        </p>
        <Button
          onClick={() => {
            updateUser({
              firstName,
              lastName,
              phone,
              avatarInitials: `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase(),
            });
            toast.success("Profile updated");
          }}
        >
          Save changes
        </Button>
      </main>
    </div>
  );
}
