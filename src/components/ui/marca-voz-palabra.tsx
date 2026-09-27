type MarcaVozPalabraProps = {
  compacta?: boolean;
  className?: string;
};

const ALTURAS_ONDA = [18, 34, 52, 30, 44, 60, 38, 26, 48, 20, 36, 56, 32, 22, 40];

export default function MarcaVozPalabra({ compacta = false, className = "" }: MarcaVozPalabraProps) {
  const factor = compacta ? 0.52 : 1;

  return (
    <div
      aria-hidden="true"
      className={`flex items-end justify-center gap-1 ${className}`}
    >
      {ALTURAS_ONDA.map((altura, indice) => (
        <span
          key={altura}
          className="w-1.5 rounded-full bg-gradient-to-t from-violet-400 to-rose-300 animate-onda"
          style={{
            height: `${Math.round(altura * factor)}px`,
            animationDelay: `${indice * 90}ms`,
          }}
        />
      ))}
    </div>
  );
}
