import { redirect } from "next/navigation";

export default async function CustomerRequestRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/customer?requestId=${encodeURIComponent(id)}`);
}
