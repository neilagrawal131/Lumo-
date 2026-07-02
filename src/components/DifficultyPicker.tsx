type Difficulty = "easy" | "medium" | "hard";

const opts: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

export function DifficultyPicker({
  value,
  onChange,
}: {
  value: Difficulty;
  onChange: (v: Difficulty) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {opts.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
            value === o.value
              ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
              : "border-border hover:border-primary/40"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
