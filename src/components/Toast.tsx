import { useUIStore } from "../store/useUIStore";
import { AnimatePresence, motion } from "framer-motion";

export default function Toast() {
  const message = useUIStore((s) => s.toastMessage);
  const visible = useUIStore((s) => s.toastVisible);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="toast"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.25 }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
