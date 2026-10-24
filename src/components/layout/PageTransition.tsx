import { motion } from "framer-motion";

// La primera página que se carga NO hace el fundido: así el HTML del prerender
// se ve completo (sin opacity: 0) aunque el JavaScript no haya cargado.
// Solo las navegaciones posteriores entre páginas hacen el fundido.
let isFirstPage = true;

export const PageTransition = ({ children }: { children: React.ReactNode }) => {
  const initial = isFirstPage ? false : { opacity: 0 };
  isFirstPage = false;

  return (
    <motion.div
      initial={initial}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.333, ease: "easeOut" }}
      style={{ width: "100%" }}
    >
      {children}
    </motion.div>
  );
};
