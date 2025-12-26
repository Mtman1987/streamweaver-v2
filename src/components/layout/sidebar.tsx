

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { UserNav } from "@/components/layout/user-nav"
import {
  LayoutDashboard,
  Terminal,
  Zap,
  Link2,
  Server,
  Settings,
  Bot,
  FileText,
  Rocket,
  Users
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { UserProfile } from "@/app/(app)/layout"
import { useLogPanel } from "@/components/logs/log-panel-context"

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/commands", icon: Terminal, label: "Commands" },
  { href: "/active-commands", icon: Rocket, label: "Active Commands" },
  { href: "/actions", icon: Zap, label: "Actions" },
  { href: "/bot-functions", icon: Bot, label: "Bot Functions" },
  { href: "/community", icon: Users, label: "Community" },
  { href: "/debug/data-files", icon: FileText, label: "Live Files" },
  { href: "/integrations", icon: Link2, label: "Integrations" },
  { href: "/api-settings", icon: Server, label: "API" },
]

interface AppSidebarProps {
  userProfile: UserProfile;
}

export default function AppSidebar({ userProfile }: AppSidebarProps) {
  const pathname = usePathname()
  const { setIsVisible } = useLogPanel();

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg group-data-[state=collapsed]:hidden">StreamWeave</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href)}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
            {/* Log Panel Toggle Button */}
           <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setIsVisible(true)}
                tooltip="View Logs"
              >
                <FileText />
                <span>Logs</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith("/settings")}
                tooltip="Settings"
              >
                <Link href="/settings">
                  <Settings />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <div className="group-data-[state=collapsed]:-mt-8 group-data-[state=collapsed]:opacity-0 duration-200 transition-[margin,opacity] ease-linear">
            <UserNav userProfile={userProfile} />
          </div>
      </SidebarFooter>
    </Sidebar>
  )
}
