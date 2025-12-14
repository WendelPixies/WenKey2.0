interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

export function CircularProgress({ 
  percentage, 
  size = 160, 
  strokeWidth = 10 
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  // Color based on percentage - same logic as Dashboard
  const getColor = () => {
    if (percentage <= 20) return '#FF0000'; // Vermelho
    if (percentage <= 40) return '#FF6600'; // Laranja
    if (percentage <= 60) return '#FFCC00'; // Amarelo
    if (percentage <= 80) return '#99CC00'; // Verde-claro
    if (percentage <= 100) return '#00CC00'; // Verde
    return '#009900'; // Verde-escuro (>100%)
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <circle
          className="text-muted"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.5s ease-in-out',
          }}
        />
      </svg>
      {/* Percentage text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color: getColor() }}>
          {Math.round(percentage)}%
        </span>
        <span className="text-xs text-muted-foreground">Alvo: 100%</span>
      </div>
    </div>
  );
}
