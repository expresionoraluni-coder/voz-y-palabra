import Skeleton from "@/components/ui/skeleton";

export default function CargandoActividad() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 px-6 py-10">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-7 w-3/4" />
      <Skeleton className="h-40" />
      <Skeleton className="h-11 w-32" />
    </div>
  );
}
