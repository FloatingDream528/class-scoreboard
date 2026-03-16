import { AnimatePresence, motion } from "framer-motion";
import { useUIStore } from "../store/useUIStore";

export default function ScoreAnimation() {
  const anim = useUIStore((s) => s.scoreAnimation);

  return (
    <AnimatePresence>
      {anim && (
        <motion.div
          className={`score-anim ${anim.positive ? "positive" : "negative"}`}
          initial={{ opacity: 0, scale: 0.3, y: 40 }}
          animate={{ opacity: 1, scale: 1.3, y: -80 }}
          exit={{ opacity: 0, scale: 0.6, y: -160 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        >
          <div className="score-anim-icon">{anim.positive ? "✨" : "📉"}</div>
          <div className="score-anim-text">{anim.text}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
