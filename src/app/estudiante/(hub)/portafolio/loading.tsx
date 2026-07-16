import Skeleton from "@/components/ui/skeleton";

export default function CargandoPortafolio() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <Skeleton className="h-8 w-52" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}
