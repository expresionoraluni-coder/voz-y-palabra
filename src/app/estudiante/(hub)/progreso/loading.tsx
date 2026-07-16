import Skeleton from "@/components/ui/skeleton";

export default function CargandoProgreso() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-6 px-6 py-10">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-48" />
    </div>
  );
}
