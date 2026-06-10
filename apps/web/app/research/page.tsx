import { redirect } from "next/navigation";

export default function ResearchRedirect({ searchParams }: { searchParams?: { ticker?: string } }) {
  const ticker = searchParams?.ticker?.trim().toUpperCase();
  redirect(ticker ? `/?ticker=${encodeURIComponent(ticker)}` : "/");
}
