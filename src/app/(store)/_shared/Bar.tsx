export function Bar({
  value,
  max,
  color = "rgba(255,255,255,0.32)",
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const w = max > 0 ? Math.max((value / max) * 100, 1) : 0;
  return (
    <div
      style={{
        height: 3,
        background: "rgba(255,255,255,0.07)",
        borderRadius: 99,
        overflow: "hidden",
        marginTop: 9,
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${w}%`,
          background: color,
          borderRadius: 99,
        }}
      />
    </div>
  );
}
