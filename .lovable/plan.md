

# Redesign do Dashboard "Meu Painel"

Vou transformar o dashboard atual em uma interface muito mais polida, com animacoes suaves, melhor hierarquia visual e componentes mais ricos.

---

## Resumo das Melhorias

1. **Header com gradiente e avatar** -- fundo com gradiente sutil de azul para transparente, badge de posicao com animacao de glow pulsante para top 3, tipografia maior e mais impactante.

2. **KPI Cards redesenhados** -- adicionar prop de cor ao KPICard, incluir um indicador de tendencia (seta para cima/baixo), bordas com gradiente sutil, hover com elevacao (framer-motion scale), e icones maiores com fundo circular.

3. **Card "Sua Posicao"** -- numero gigante com gradiente dourado (text-gradient-gold) para top 3, adicionar icone de trofeu animado (float), barra de progresso com gradiente em vez de cor solida, e separador visual mais elegante.

4. **Card "Voce vs Media"** -- barras lado a lado em vez de empilhadas, com labels integrados nas barras, indicador com icone animado (fogo/alvo), visual mais compacto e impactante.

5. **Card de Margem** -- substituir barra linear por um indicador circular/gauge visual usando SVG, com cor dinamica e animacao de preenchimento na montagem.

6. **Grafico de Evolucao** -- dots customizados, tooltip com design mais rico, area com gradiente mais pronunciado, animacao de entrada no grafico.

7. **Animacoes globais** -- usar framer-motion para entrada escalonada (stagger) de cada secao, hover states mais ricos nos cards.

8. **Espacamento e tipografia** -- mais respiro entre secoes, titulos de secao com estilo consistente (label pequeno + linha decorativa).

---

## Detalhes Tecnicos

### Arquivo: `src/components/KPICard.tsx`
- Adicionar prop opcional `trend` (up/down/neutral) e `trendValue` (string)
- Adicionar prop opcional `accentColor` (string CSS)
- Envolver em `motion.div` com `whileHover={{ scale: 1.02, y: -2 }}` e `initial/animate` para fade-in
- Icone em container circular maior (h-12 w-12) com fundo gradiente sutil
- Borda esquerda colorida (4px) usando accentColor

### Arquivo: `src/pages/MeuPainel.tsx`
Reescrita completa do layout mantendo a mesma logica de dados:

**Header (Secao 1):**
- Gradiente de fundo: `bg-gradient-to-r from-primary/5 via-card to-card`
- Badge de posicao: container circular grande com borda glow animada (CSS box-shadow animation) para top 3
- Texto de saudacao maior (text-2xl sm:text-3xl)
- Linha decorativa dourada abaixo

**KPI Cards (Secao 2):**
- Usar `motion.div` com `variants` e `staggerChildren: 0.1` para entrada sequencial
- Cada card com borda esquerda colorida (dourado para vendido, verde para comissao, azul para %, cinza para notas)

**Cards lado a lado (Secao 3):**
- Card Posicao: numero com `text-7xl` e classe `text-gradient-gold` para top 3, SVG circular decorativo atras do numero como "halo"
- Card Media: layout com barras horizontais mais grossas (h-5), percentual inline na barra, cores mais vibrantes

**Margem (Secao 4):**
- Gauge circular usando SVG (circulo com stroke-dasharray animado)
- Valor centralizado dentro do circulo
- Legenda de faixas coloridas abaixo (verde/amarelo/vermelho)

**Grafico (Secao 5):**
- Titulo com icone decorativo
- Dots customizados maiores no hover
- Gradientes mais intensos (0.3 opacidade)
- Container com padding maior

**Animacoes (framer-motion):**
- Container pai com `staggerChildren: 0.08`
- Cada secao entra com `opacity: 0, y: 20` -> `opacity: 1, y: 0`
- KPIs com delay escalonado
- Numeros grandes com contagem animada (opcional, simples)

### Arquivo: `src/index.css`
- Adicionar keyframe `@keyframes glow-pulse` para o badge de posicao top 3
- Classe utilitaria `.glow-gold` com `box-shadow` animado

### Nenhum arquivo novo necessario
Todas as mudancas sao em arquivos existentes.

