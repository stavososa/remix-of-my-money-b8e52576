import { motion } from "framer-motion";
import { Sparkles, Zap, Shield } from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "Design Intuitivo",
    description: "Interfaces que encantam e guiam seus usuários naturalmente.",
  },
  {
    icon: Zap,
    title: "Performance Extrema",
    description: "Velocidade otimizada para cada interação, sem compromissos.",
  },
  {
    icon: Shield,
    title: "Segurança Total",
    description: "Proteção robusta dos seus dados em todas as camadas.",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <span className="font-heading text-xl font-bold text-gradient">inicar</span>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 glow">
              Começar
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden hero-gradient">
        {/* Decorative orb */}
        <div className="pointer-events-none absolute top-1/4 right-1/4 h-72 w-72 rounded-full bg-primary/5 blur-3xl animate-float" />
        
        <div className="container relative z-10 pt-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mx-auto max-w-3xl text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-sm text-secondary-foreground"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Novo lançamento
            </motion.div>

            <h1 className="font-heading text-5xl font-bold leading-tight tracking-tight sm:text-7xl">
              Crie algo{" "}
              <span className="text-gradient">extraordinário</span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Uma plataforma poderosa para transformar suas ideias em realidade.
              Simples, rápido e bonito.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
            >
              <button className="rounded-xl bg-primary px-8 py-3.5 font-heading font-semibold text-primary-foreground transition-all hover:opacity-90 glow">
                Começar agora
              </button>
              <button className="rounded-xl border border-border px-8 py-3.5 font-heading font-semibold text-foreground transition-all hover:bg-secondary">
                Saiba mais
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border py-24">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <h2 className="font-heading text-3xl font-bold sm:text-4xl">
              Tudo que você precisa
            </h2>
            <p className="mt-4 text-muted-foreground">
              Ferramentas pensadas para acelerar seu fluxo de trabalho.
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-3">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="group rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/30 hover:glow"
              >
                <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-card-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © 2026 inicar. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

export default Index;
