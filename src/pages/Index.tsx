import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import meezyLogo from "@/assets/meezy-logo.png";
import hoodie from "@/assets/hoodie.png";

const STEPS = [
  "Initializing verification protocol...",
  "Scanning product identifiers...",
  "Cross-referencing database...",
  "Analyzing material signatures...",
  "Verifying manufacturer tags...",
  "Confirming authenticity...",
];

const Index = () => {
  const [phase, setPhase] = useState<"loading" | "verified">("loading");
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (phase !== "loading") return;

    const delays = [800, 1200, 1000, 1400, 900, 1100];
    let timeout: ReturnType<typeof setTimeout>;
    let progressInterval: ReturnType<typeof setInterval>;

    const totalDuration = delays.reduce((a, b) => a + b, 0);
    const startTime = Date.now();

    progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress(Math.min((elapsed / totalDuration) * 100, 100));
    }, 50);

    const runStep = (i: number) => {
      if (i >= STEPS.length) {
        clearInterval(progressInterval);
        setProgress(100);
        setTimeout(() => setPhase("verified"), 600);
        return;
      }
      setStepIndex(i);
      timeout = setTimeout(() => runStep(i + 1), delays[i]);
    };

    runStep(0);

    return () => {
      clearTimeout(timeout);
      clearInterval(progressInterval);
    };
  }, [phase]);

  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-background text-foreground font-mono flex flex-col items-center justify-center px-4">
        <motion.img
          src={meezyLogo}
          alt="Meezy Archive"
          className="h-12 object-contain mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />

        <div className="w-full max-w-md space-y-6">
          {/* Progress bar */}
          <div className="border-2 border-foreground h-3 w-full overflow-hidden">
            <motion.div
              className="h-full bg-foreground"
              style={{ width: `${progress}%` }}
              transition={{ ease: "linear" }}
            />
          </div>

          {/* Current step */}
          <div className="h-6 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={stepIndex}
                className="text-xs tracking-[0.2em] uppercase text-muted-foreground text-center"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                {STEPS[stepIndex]}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Step indicators */}
          <div className="flex justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <motion.div
                key={i}
                className="h-1.5 w-6 border border-foreground"
                animate={{
                  backgroundColor:
                    i <= stepIndex
                      ? "hsl(0 0% 8%)"
                      : "transparent",
                }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>
        </div>

        <motion.p
          className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground mt-12"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Authenticating
        </motion.p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        {/* Header */}
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <img src={meezyLogo} alt="Meezy Archive" className="h-16 object-contain" />
          <p className="text-xs tracking-[0.4em] uppercase text-muted-foreground">
            Authenticity Verification
          </p>
        </motion.div>

        {/* Verification Badge */}
        <motion.div
          className="border-2 border-foreground p-4 text-center"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <motion.p
            className="text-sm tracking-[0.3em] uppercase font-bold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            ✓ Item Authenticated
          </motion.p>
        </motion.div>

        {/* Product Section */}
        <motion.div
          className="border-2 border-foreground"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Product Image */}
            <div className="border-b-2 md:border-b-0 md:border-r-2 border-foreground p-8 flex items-center justify-center bg-secondary">
              <motion.img
                src={hoodie}
                alt="Denim Tears Mono Cotton Wreath Hoodie Navy On Navy"
                className="max-h-72 object-contain"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              />
            </div>

            {/* Product Details */}
            <motion.div
              className="p-8 space-y-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1 }}
            >
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-1">Item</p>
                <p className="text-sm font-bold tracking-wide uppercase leading-tight">
                  Denim Tears Mono Cotton Wreath Hoodie Navy On Navy
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-1">Size</p>
                  <p className="text-sm font-bold">M</p>
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-1">Condition</p>
                  <p className="text-sm font-bold">New / Deadstock</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-1">Auth ID</p>
                  <p className="text-sm font-bold">MA-2026-00487</p>
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-1">Verified</p>
                  <p className="text-sm font-bold">03.24.2026</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-1">Purchased</p>
                  <p className="text-sm font-bold">03.20.2026</p>
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-1">Owned By</p>
                  <p className="text-sm font-bold">@meezy_user</p>
                </div>
              </div>
              <div className="pt-2 border-t border-muted-foreground/20">
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-2">Ownership History</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">03.20.2026</span>
                    <span className="font-bold">@meezy_user</span>
                    <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground border border-muted-foreground/30 px-2 py-0.5">Current</span>
                  </div>
                </div>
              </div>
              <motion.button
                className="w-full border-2 border-foreground py-2.5 text-xs tracking-[0.3em] uppercase font-bold hover:bg-foreground hover:text-background transition-colors"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                Transfer Ownership
              </motion.button>
            </motion.div>
          </div>
        </motion.div>

        {/* Certificate Footer */}
        <motion.div
          className="border-2 border-foreground p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.2 }}
        >
          <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
            Certificate of Authenticity
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            This item has been verified through Meezy Archive's multi-point authentication process.
            Each product undergoes rigorous inspection by our expert team to ensure originality
            and condition accuracy. This certificate confirms the item meets all authenticity standards.
          </p>
          <div className="pt-2 border-t border-muted-foreground/20 flex items-center justify-between">
            <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
              Meezy Archive © 2026
            </p>
            <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
              meezyarchive.com
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
