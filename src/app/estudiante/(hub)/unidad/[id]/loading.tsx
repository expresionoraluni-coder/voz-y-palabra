import Skeleton from "@/components/ui/skeleton";

export default function CargandoUnidad() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-6 px-6 py-10">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-24" />
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    </div>
  );
}
