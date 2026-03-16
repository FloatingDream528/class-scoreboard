import { motion } from "framer-motion";

interface Props {
  label: string;
  value: number | string;
  icon: string;
  colorClass?: string;
}

export default function StatCard({ label, value, icon, colorClass = "" }: Props) {
  return (
    <motion.article
      className="card stat-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="stat-icon">{icon}</div>
      <h3>{label}</h3>
      <div className={`metric ${colorClass}`}>{value}</div>
    </motion.article>
  );
}
