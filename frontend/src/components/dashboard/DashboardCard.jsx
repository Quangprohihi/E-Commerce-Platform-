import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const MotionLink = motion(Link);

export default function DashboardCard({
  to,
  icon: Icon,
  title,
  description,
  accentColor,
  badge,
  index = 0,
}) {
  return (
    <MotionLink
      to={to}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, scale: 1.015 }}
      className="dashboard-card glass rounded-2xl overflow-hidden block"
    >
      <div className="card-accent" style={{ background: accentColor }} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="rounded-xl p-2.5" style={{ background: `${accentColor}1a` }}>
            <Icon size={20} style={{ color: accentColor }} strokeWidth={1.6} />
          </div>
          {badge && (
            <span
              className="text-xs uppercase tracking-[0.12em] px-2 py-0.5 rounded-full"
              style={{ background: `${accentColor}15`, color: accentColor }}
            >
              {badge}
            </span>
          )}
        </div>
        <p className="font-serif text-xl text-primary">{title}</p>
        {description ? <p className="text-sm text-text-muted mt-1.5">{description}</p> : null}
      </div>
    </MotionLink>
  );
}
