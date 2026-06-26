'use client';

import { motion } from 'framer-motion';
import { Gem, Ruler, FileCheck } from 'lucide-react';

const STEPS = [
  { icon: Gem, title: 'Escolha o mármore', description: 'Navegue pelo nosso catálogo e escolha a peça ideal para seu projeto.' },
  { icon: Ruler, title: 'Informe as medidas', description: 'Diga as dimensões da sua bancada, piso ou fachada.' },
  { icon: FileCheck, title: 'Receba o orçamento', description: 'Em poucos minutos você recebe um orçamento detalhado em PDF.' },
];

export function HowItWorks() {
  return (
    <section className="px-6 sm:px-10 py-24 max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-16">Como funciona</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className="text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-marble-gold/10 flex items-center justify-center">
                <Icon className="text-marble-gold" size={28} />
              </div>
              <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
              <p className="text-white/60 text-sm">{step.description}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
