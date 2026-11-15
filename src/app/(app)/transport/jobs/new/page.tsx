import { redirect } from "next/navigation";

export default async function NewJobPage({ searchParams }: PageProps<"/transport/jobs/new">) {
  const { copy } = await searchParams;
  const query = new URLSearchParams();
  if (typeof copy === "string" && copy) query.set("copy", copy);
  else query.set("new", "1");
  redirect(`/transport/jobs?${query}`);
}
