import { redirect } from "next/navigation";

export default async function EditActionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/active-commands?actionId=${encodeURIComponent(id)}`);
}
