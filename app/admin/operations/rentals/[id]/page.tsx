import { redirect } from "next/navigation";

export default async function AdminRentalRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/operations?requestId=${encodeURIComponent(id)}`);
}
