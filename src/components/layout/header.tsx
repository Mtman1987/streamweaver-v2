import { SidebarTrigger } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Orbit, Anchor } from "lucide-react"
import { useEffect, useState } from "react"
import Image from "next/image"

export default function Header() {
  const [isDocked, setIsDocked] = useState(true);

  useEffect(() => {
    const dockingStatus = localStorage.getItem('apollo-docking-status');
    if (dockingStatus) {
      setIsDocked(dockingStatus === 'docked');
    }
  }, []);

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b bg-background/80 backdrop-blur-sm px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-0 mb-4">
      <div className="flex items-center gap-3">
        <div className="md:hidden">
          <SidebarTrigger />
        </div>
        
        <div className="flex items-center gap-2">
          <Image 
            src="/StreamWeaver.png" 
            alt="StreamWeaver" 
            width={32} 
            height={32}
            className="rounded-md"
          />
          <span className="font-bold text-lg hidden sm:inline bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            StreamWeaver
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="flex items-center gap-1">
          <Orbit className="h-3 w-3" />
          Powered by Space Mountain
        </Badge>
        <Badge variant={isDocked ? "default" : "secondary"} className="flex items-center gap-1">
          <Anchor className="h-3 w-3" />
          {isDocked ? 'Docked at Apollo Station' : 'Independent Flight'}
        </Badge>
      </div>
    </header>
  )
}
