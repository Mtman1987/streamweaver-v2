'use client';

import { VoiceCommander } from "@/app/(app)/dashboard/voice-commander";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function VoiceCommanderPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Voice Commander</h1>
        <VoiceCommander variant="card" />
      </div>
    </div>
  );
}
