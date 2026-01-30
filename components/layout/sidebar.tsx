"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Gavel,
  Users,
  FileCheck,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Profile } from "@/types/database";

interface SidebarProps {
  profile: Profile;
  open?: boolean;
  onClose?: () => void;
}

const vendorNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/rfps", label: "Browse RFPs", icon: FileText },
  { href: "/bids", label: "My Bids", icon: Gavel },
  { href: "/profile", label: "Profile", icon: Settings },
];

const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/rfps", label: "Manage RFPs", icon: FileText },
  { href: "/admin/bids", label: "Review Bids", icon: Gavel },
  { href: "/admin/contracts", label: "Contracts", icon: FileCheck },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/profile", label: "Profile", icon: Settings },
];

export function Sidebar({ profile, open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const navItems = profile.role === "admin" ? adminNavItems : vendorNavItems;

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b md:hidden">
          <span className="font-semibold text-primary">Menu</span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                item.href !== "/admin" &&
                pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
