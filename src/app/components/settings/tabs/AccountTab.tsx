"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Lock, Loader2, Check, AlertCircle } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "sonner";

export function AccountTab() {
  const { user, updateProfile, changePassword } = useAuth();

  // 用户名修改状态
  const [name, setName] = useState(user?.name || "");
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  // 密码修改状态
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // 更新用户名
  const handleUpdateName = useCallback(async () => {
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    if (name === user?.name) {
      toast.info("Name is unchanged");
      return;
    }

    setIsUpdatingName(true);
    try {
      await updateProfile({ name: name.trim() });
      toast.success("Name updated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update name");
    } finally {
      setIsUpdatingName(false);
    }
  }, [name, user?.name, updateProfile]);

  // 修改密码
  const handleChangePassword = useCallback(async () => {
    setPasswordError(null);

    // 验证
    if (!oldPassword) {
      setPasswordError("Please enter your current password");
      return;
    }

    if (!newPassword) {
      setPasswordError("Please enter a new password");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    if (oldPassword === newPassword) {
      setPasswordError("New password must be different from current password");
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(oldPassword, newPassword);
      toast.success("Password changed successfully");
      // 清空表单
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to change password";
      setPasswordError(message);
      toast.error(message);
    } finally {
      setIsChangingPassword(false);
    }
  }, [oldPassword, newPassword, confirmPassword, changePassword]);

  return (
    <div className="space-y-8">
      {/* Profile Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Profile</h3>
            <p className="text-xs text-muted-foreground">Update your personal information</p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={user?.email || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed
            </p>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Display Name
            </Label>
            <div className="flex gap-2">
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="flex-1"
              />
              <Button
                onClick={handleUpdateName}
                disabled={isUpdatingName || !name.trim() || name === user?.name}
                className="min-w-[100px]"
              >
                {isUpdatingName ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
            <Lock className="h-4 w-4 text-orange-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Change Password</h3>
            <p className="text-xs text-muted-foreground">Update your account password</p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          {/* Error Message */}
          {passwordError && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="oldPassword" className="text-sm font-medium">
              Current Password
            </Label>
            <Input
              id="oldPassword"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Enter your current password"
              autoComplete="current-password"
            />
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-sm font-medium">
              New Password
            </Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min 6 characters)"
              autoComplete="new-password"
            />
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm New Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              autoComplete="new-password"
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleChangePassword}
            disabled={isChangingPassword || !oldPassword || !newPassword || !confirmPassword}
            className="w-full"
          >
            {isChangingPassword ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Changing Password...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Change Password
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

