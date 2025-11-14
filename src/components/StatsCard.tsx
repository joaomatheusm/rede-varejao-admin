import "./StatsCard.css";

interface StatItem {
  label: string;
  value: string;
  icon?: string;
  color: string;
}

interface StatsCardProps {
  stats: StatItem[];
}

export default function StatsCard({ stats }: StatsCardProps) {
  return (
    <div className="stats-container">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="stat-card"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          {stat.icon && (
            <div className="stat-icon" style={{ color: stat.color }}>
              {stat.icon}
            </div>
          )}
          <div className="stat-content">
            <div className="stat-value" style={{ color: stat.color }}>
              {stat.value}
            </div>
            <div className="stat-label">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
