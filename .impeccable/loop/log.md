# Impeccable Loop — Log de Autoaperfeiçoamento UX/UI

## Metadados do Projeto
- **Aplicação**: OpenFamilyOffice (Controle financeiro de casal + 2 MEIs)
- **Usuários**: Osmar e Vera (Casal), uso diário
- **Modo**: 100% Autônomo (decisões conservadoras registradas neste log)
- **Escopo**: SOMENTE apresentação e UX. Proibido alterar lógica, rotas, cálculos ou dados.

---

## Linha de Base — Rodada 0

### 1. Detecção Automatizada (`impeccable detect`)
- `impeccable detect src/`: **0 achados** (código Python de backend limpo de marcações web).
- `impeccable detect web/` (estático): **16 achados**
  - 13x `[ai-color-palette]` (gradientes genéricos violeta/índigo/rosa em `page.tsx`, `SettingsModal.tsx`, `ExecutiveModals.tsx`)
  - 2x `[overused-font]` (Plus Jakarta Sans saturada em `globals.css` e `layout.tsx`)
  - 1x `[bounce-easing]` (animação bounce em botão de teste de provedor em `SettingsModal.tsx`)
- `impeccable detect http://localhost:3000` (renderizado em tempo de execução): **101 achados**
  - `low-contrast`: 38 ocorrências (ex: texto #eff6ff sobre #7b84f6 com taxa 3.0:1; #64748b sobre #121722 com taxa 3.8:1)
  - `dark-glow`: 22 ocorrências (box-shadows cromáticos neon #6366f1, #5b67f6, #312e81 em fundo escuro)
  - `undersized-ui-text` & `tiny-text`: 18 ocorrências (textos de 10px e 11px em dados funcionais e badges)
  - `ai-color-palette`: 14 ocorrências de gradientes e acentos típicos de gerador de IA
  - `nested-cards`: 4 ocorrências (cartões dentro de cartões gerando profundidade excessiva)
  - `skipped-heading`: 1 ocorrência (`<h1>` seguido de `<h3>` na página inicial, ausência de `<h2>`)
  - `pulsing-dot`: 4 ocorrências (pontos pulsantes com `animate-pulse`/`animate-ping` simulando falsa atividade)

### 2. Notas da Linha de Base por Dimensão (0 a 4)

| Dimensão | Nota Rodada 0 | Diagnóstico Chave |
|---|:---:|---|
| **1. Acessibilidade (A11y)** | **1 / 4** | Múltiplas violações de contraste WCAG AA (< 4.5:1), heading hierarchy com salto de `h1` para `h3`, alvos de toque móveis < 44px em filtros e botões de cabeçalho. |
| **2. Performance** | **2 / 4** | Animações de layout e glow contínuo, re-renderizações e falta de contenção de repaint em gráficos SVG. |
| **3. Theming** | **2 / 4** | Tokens misturados com valores hexadecimais arbitrários e gradientes inline sem suporte consistente a contraste em dark e light mode. |
| **4. Design Responsivo** | **2 / 4** | Drawer do chat utilizável, mas inputs e botões de câmera em telas de 390px ficam comprimidos; tabelas com quebra de layout sem rolagem horizontal isolada em celular. |
| **5. Integridade de Implementação** | **1 / 4** | Presença de claims não comprovados ("Air-Gapped Local", "Segregação 100% Protegido"), ticker decorativo de cripto/índices externos (BTC, NASDAQ, S&P) desalinhado da tesouraria familiar de MEIs, padrões visuais genéricos de IA (glow neon, roxo/índigo saturado). |
| **Total Saúde da UI** | **8 / 20** | **Faixa: Poor (Revisão Substancial Necessária)** |

### 3. Matriz de Achados P0 – P3 da Linha de Base

- **[P0 - Bloqueador de UX/A11y]**:
  - Contraste ilegível em dados financeiros e badges de status (< 3.0:1) impedindo leitura rápida por Vera e Osmar no celular.
  - Alvos de toque em celular (câmera, envio, seleção de entidade) inferiores a 44x44px.
- **[P1 - Maior / Integridade & Confiança]**:
  - Claims não factuais: "Air-Gapped Local" e "100% Protegido" em cabeçalhos enquanto o sistema suporta APIs e LLMs em nuvem.
  - Barra decorativa de mercado especulativo (BTC, NASDAQ, S&P 500) gerando ruído e desvio do objetivo de tesouraria familiar e teto MEI.
  - Ausência de `<h2>` intermediário (quebra de outline de leitor de tela).
- **[P2 - Menor / Apresentação]**:
  - Glow neon escuro (`dark-glow`) e gradientes purpúreos artificiais (`ai-color-palette`).
  - Fontes e números tabulares ausentes em partes dos cards de extrato e métricas.
  - Animação de `bounce` em `SettingsModal.tsx` e `animate-ping` decorativo em pendências.
- **[P3 - Polimento]**:
  - Micro-ajustes de espaçamento, raio de borda de botões e transição de tema suave.

---

## Planejamento das Rodadas

- **Rodada 1**: **SIMPLIFY** (distill, clarify, adapt)
  - Distill: remover a barra de ticker externo especulativo (BTC/NASDAQ/S&P), cards redundantes e ruídos visuais.
  - Clarify: substituir claims enganosos ("Air-Gapped Local", "100% Protegido") por textos serenos e transparentes ("Processamento Local e Privado", "Segregação Fiscal em Monitoramento").
  - Adapt: adequar alvos de toque no chat e navegação para ≥ 44px, otimizar botão de câmera e upload com uma mão em 390px.
- **Rodada 2**: **REFINE** (layout, typeset, colorize, quieter/bolder, animate, delight)
  - Eliminar os gradientes de IA e halos escuros neon (substituir por superfícies sóbrias, contrastes AA).
  - Alinhamento numérico à direita obrigatório e algarismos tabulares JetBrains Mono.
  - Eliminação de `pulsing-dot` e `bounce-easing`.
  - Registrar que `overdrive` foi pulado de propósito conforme restrição do usuário.
- **Rodada 3**: **HARDEN & POLISH** (harden, onboard, optimize, polish)
  - Tratamento de estados vazios, erros de rede, mensagens pt-BR sem truncamento.
  - Auditoria final de regressão, testes 100% verdes, merge condicional.
