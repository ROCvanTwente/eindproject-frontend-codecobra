interface TriangleDecorationProps {
  position?:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";
  color?: "red" | "blue" | "light-blue";
  size?: "small" | "medium" | "large";
}

export function TriangleDecoration({
  position = "top-right",
  color = "red",
  size = "medium",
}: TriangleDecorationProps) {
  const colors = {
    red: "#E30613",
    blue: "#0066B3",
    "light-blue": "rgba(0, 102, 179, 0.2)",
  };

  const sizes = {
    small: 60,
    medium: 100,
    large: 150,
  };

  const positions = {
    "top-left": "top-0 left-0",
    "top-right": "top-0 right-0 rotate-90",
    "bottom-left": "bottom-0 left-0 -rotate-90",
    "bottom-right": "bottom-0 right-0 rotate-180",
  };

  const triangleSize = sizes[size];

  return (
    <div
      className={`absolute ${positions[position]} pointer-events-none overflow-hidden`}
    >
      <svg
        width={triangleSize}
        height={triangleSize}
        viewBox="0 0 100 100"
        className="block"
      >
        <polygon
          points="0,0 100,0 0,100"
          fill={colors[color]}
        />
      </svg>
    </div>
  );
}