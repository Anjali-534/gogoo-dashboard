"use client";
import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function OldDriverRoute() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => {
    if (id) router.replace(`/dashboard/drivers/${id}`);
  }, [id, router]);
  return (
    <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
      Redirecting…
    </div>
  );
}
