# Plano de Implementação — Fase 1: Generative UI & Calculadoras Interativas
## Transformando o Chat da IA em uma Página Dinâmica Viva (Filosofia Andrej Karpathy)

> **Documento de Especificação Técnica e Plano de Trabalho**  
> **Arquivo:** `references/melhorias/02_plano_fase1_generative_ui_e_calculadoras.md`  
> **Status:** Concluído e Validado (Testes de Backend + Build Frontend 100% Verificados)  
> **Prioridade:** P0 (Valor Imediato para a Família)  
> **Estimativa de Esforço:** 2 Semanas

---

## 1. Contexto e Justificativa

Conforme identificado na pesquisa de mercado (`references/melhorias/pesquisa-melhorias.md`), a interação com assistentes financeiros convencionais através de longos parágrafos de texto ou tabelas estáticas em Markdown é ineficiente e enfadonha. Quando o casal pergunta: *"Vale a pena trocar de carro agora?"* ou *"Quanto terei se guardar R$ 1.500 por mês?"*, o usuário precisa de **uma página viva para interagir, arrastar controles deslizantes (*sliders*) e ver o resultado recalculado instantaneamente**.

Inspirado na visão de **Andrej Karpathy** (*"Dar a resposta como uma página"*), a Fase 1 implementa a camada de **Generative UI Declarativa**:
1. A IA formula a resposta acompanhada por um payload JSON estruturado de artefato (`InteractiveArtifact`).
2. O frontend em Next.js detecta o artefato no fluxo SSE (*Server-Sent Events*) e renderiza componentes React interativos no próprio fluxo da conversa.
3. O usuário pode ajustar os sliders (aporte inicial, taxa, anos, desconto à vista) sem recarregar a tela e sem gastar novos tokens de IA.

---

## 2. Arquitetura Técnica e Arquivos Envolvidos

```
┌────────────────────────────────────────────────────────────────────────┐
│                              BACKEND                                   │
│  src/intelligence/generative_ui_schemas.py (NOVO)                      │
│     ├── ArtifactType Enum ('compound_interest', 'purchase_opp', ...)    │
│     └── Pydantic Models com validação estrita                          │
│                                                                        │
│  src/intelligence/assistant_tools.py (MODIFICAR)                       │
│     └── Novas tools para IA invocar geração de simuladores             │
│                                                                        │
│  src/llm/smart_router.py (MODIFICAR)                                   │
│     └── Prompt engineering para emissão de artefatos JSON              │
│                                                                        │
│  src/web/api.py (MODIFICAR)                                            │
│     └── Suporte ao streaming SSE de blocos de artefatos interativos   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ SSE Stream: data: {"type": "artifact", ...}
┌───────────────────────────────────▼────────────────────────────────────┐
│                              FRONTEND                                  │
│  web/app/components/interactive/ (NOVO DIRETÓRIO)                      │
│     ├── ArtifactRenderer.tsx (Dispatcher de componentes)               │
│     ├── CompoundInterestCard.tsx (Calculadora com sliders e SVG)      │
│     ├── PurchaseOpportunityCard.tsx (Simulador de compras & TCO)       │
│     └── RealVsNominalCard.tsx (Desconto automático de IPCA/CPI)        │
│                                                                        │
│  web/app/page.tsx (MODIFICAR)                                          │
│     └── Suporte à renderização de artefatos na gaveta de chat          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Lista Detalhada de Tarefas e Subtarefas

### 3.1 Backend: Schemas e Protocolo de Generative UI

- [x] **Tarefa 1.1: Definir os Schemas Pydantic de Artefatos Interativos**  
  - [x] Criar o arquivo `src/intelligence/generative_ui_schemas.py`.
  - [x] Implementar o enum `ArtifactType`:
    - `COMPOUND_INTEREST = "compound_interest"`
    - `PURCHASE_OPPORTUNITY = "purchase_opportunity"`
    - `REAL_VS_NOMINAL = "real_vs_nominal"`
    - `MORTGAGE_VS_RENT = "mortgage_vs_rent"`
  - [x] Definir a classe base `InteractiveArtifact(BaseModel)` com campos: `id`, `artifact_type`, `title`, `description`, `created_at`, `payload`.
  - [x] Modelar `CompoundInterestPayload`:
    - `initial_principal`: float (default sugerido pelo saldo ou pergunta).
    - `monthly_deposit`: float.
    - `annual_rate_percent`: float (inicializado com a Selic ou CDI real capturado do BCB).
    - `years`: int (default 10 ou 20).
    - `currency_prefix`: str ("R$" ou "US$").
  - [x] Modelar `PurchaseOpportunityPayload`:
    - `item_name`: str (ex: "iPhone 16 Pro", "Carro SUV", "Notebook").
    - `cash_price`: float.
    - `installments_count`: int.
    - `installment_value`: float.
    - `benchmark_annual_rate`: float.
    - `cooling_off_days_suggested`: int (7 a 30 dias).
  - [x] Modelar `RealVsNominalPayload`:
    - `nominal_rate_percent`: float.
    - `inflation_annual_percent`: float (IPCA ou CPI oficial mais recente).
    - `income_tax_percent`: float (15% a 22,5% regressivo ou isento para LCI/LCA/FIIs).

- [x] **Tarefa 1.2: Enriquecer as Ferramentas do Assistente (`assistant_tools.py`)**  
  - [x] Modificar `src/intelligence/assistant_tools.py` para incluir funções determinísticas de apoio:
    - `calculate_compound_interest_series(principal, monthly, annual_rate, years)` retornando a progressão ano a ano.
    - `calculate_opportunity_cost(amount, rate, years_list=[5, 10, 20])` retornando o custo de oportunidade futuro.
    - `calculate_real_return(nominal_rate, inflation_rate, tax_rate=0.0)` aplicando a fórmula de Fisher: $(1 + r_{real}) = \frac{1 + r_{nominal}(1 - tax)}{1 + i}$.
  - [x] Adicionar decorators ou metadados de tool-calling para que o modelo de linguagem possa invocar essas ferramentas explicitamente quando o usuário fizer perguntas prospectivas.

- [x] **Tarefa 1.3: Atualizar Prompts e Classificação no SmartRouter**  
  - [x] Em `src/llm/smart_router.py`, atualizar a classificação de intenção `INVESTMENT_MACRO` e `DEEP_REASONING` para identificar gatilhos de simulação interativa (ex: *"e se eu guardar"*, *"calculadora de juros"*, *"vale a pena comprar"*, *"parcelar ou à vista"*).
  - [x] Atualizar o system prompt do assistente (`prompts/09_chat_assistant_asd80.md`) instruindo o modelo a emitir bloco especial de artefato delimitado:
    ```json
    ```artifact:compound_interest
    {
      "initial_principal": 5000,
      "monthly_deposit": 500,
      "annual_rate_percent": 11.25,
      "years": 15,
      "currency_prefix": "R$"
    }
    ```
    ```
  - [x] Manter o texto introdutório conciso no estilo ASD-STE100 (~80%), delegando a exploração e os detalhes para o componente interativo.

- [x] **Tarefa 1.4: Suporte ao Streaming SSE de Artefatos no FastAPI (`src/web/api.py`)**  
  - [x] Modificar o gerador assíncrono do endpoint `/api/chat` (ou `/api/py/chat`) para fazer parsing on-the-fly de blocos de artefato.
  - [x] Transmitir chunks SSE específicos quando um bloco de artefato for detectado:
    - `data: {"type": "text", "content": "..."}`
    - `data: {"type": "artifact", "artifact": { ... }}`
  - [x] Garantir que o sanitizador PII continue blindando quaisquer dados sensíveis que possam passar pelo payload do artefato.

---

### 3.2 Frontend: Componentes Interativos Declarativos

- [x] **Tarefa 1.5: Criar o Componente `CompoundInterestCard.tsx`**  
  - [x] Criar `web/app/components/interactive/CompoundInterestCard.tsx` baseado na especificação de design de alta fidelidade:
    - Grid de 2 colunas no desktop (1 coluna no mobile).
    - Coluna Esquerda:
      - Título com badge *"exemplo vivo"*.
      - 4 Sliders estilizados com Tailwind CSS: Aporte Inicial, Aporte Mensal, Taxa Anual (%) e Prazo (anos).
      - Feedback numérico ao vivo em `JetBrains Mono` dourado/amber.
      - Box explicativo no rodapé: *"Juros compostos rendem sobre o que já rendeu..."*.
    - Coluna Direita:
      - Três cards de métricas no topo: **Valor Final**, **Total Investido** (cinza), **Total em Juros** (âmbar).
      - Gráfico de barras empilhadas interativo em SVG nativo mostrando a evolução anual da proporção Investido vs Juros.
      - Hover tooltip exibindo o saldo discriminado ano a ano.
      - Escala de tempo: "ano 1" até "ano N".
  - [x] Implementar memoização com `useMemo` para recalcular a série matemática sem travamentos de renderização (60 FPS).
  - [x] Garantir acessibilidade total por teclado nos sliders (teclas de seta esquerda/direita e PageUp/PageDown).

- [x] **Tarefa 1.6: Criar o Componente `PurchaseOpportunityCard.tsx`**  
  - [x] Criar `web/app/components/interactive/PurchaseOpportunityCard.tsx` para decisões de grandes compras:
    - Comparativo instantâneo: **Comprar à Vista (com desconto)** vs **Parcelar no Cartão mantendo o dinheiro rendendo no CDI**.
    - Gráfico interativo de Custo de Oportunidade:
      - Barra A: Valor do bem depreciado após 2, 5 e 10 anos.
      - Barra B: O mesmo dinheiro investido no Tesouro IPCA+ / S&P 500 no mesmo período.
    - Métrica de "Tempo de Trabalho Necessário": Calcula quantas horas ou dias de trabalho da família pagam aquela compra, com base na renda mensal do casal.
    - Botão de Trava Comportamental: *"Adicionar ao Período de Reflexão (Cooling-Off de 14 Dias)"*.

- [x] **Tarefa 1.7: Criar o Componente `RealVsNominalCard.tsx`**  
  - [x] Criar `web/app/components/interactive/RealVsNominalCard.tsx`:
    - Demonstração visual do impacto da inflação (IPCA/CPI) e dos impostos (come-cotas/tabela regressiva) sobre investimentos.
    - Sliders para Taxa Nominal (ex: 12% a.a.) e Inflação Projetada (ex: 5% a.a.).
    - Barra de decomposição percentual: Rentabilidade Real (verde) + Imposto de Renda (cinza) + Corrosão Inflacionária (vermelho).
    - Veredito claro: *"Ganho real líquido de apenas 3,8% ao ano"*.

- [x] **Tarefa 1.8: Criar o Dispatcher `ArtifactRenderer.tsx` e Integrar na Gaveta de Chat**  
  - [x] Criar `web/app/components/interactive/ArtifactRenderer.tsx`:
    - Recebe o JSON do artefato e renderiza o componente correto correspondente ao `artifact_type`.
    - Fallback elegante para renderização em JSON/tabela caso ocorra um erro de renderização no componente filho (*Error Boundary* isolado).
  - [x] Modificar `web/app/page.tsx` (na seção da gaveta do chat):
    - Alterar a estrutura de mensagens para suportar mensagens mistas (texto + lista de `artifacts`).
    - Exibir o componente interativo diretamente abaixo do balão de resposta do assistente.
    - Adicionar botão de ação rápida: *"Exportar Simulação em PDF"* ou *"Fixar no Dashboard"*.

---

## 4. Critérios de Aceitação e Definição de Pronto (DoD)

1. [x] Quando o usuário perguntar no chat: *"Se eu investir R$ 1.000 agora e R$ 400 por mês a 11% ao ano, quanto terei em 20 anos?"*, o assistente responde em texto conciso e emite o componente `CompoundInterestCard` pré-carregado com esses valores.
2. [x] Arrastar qualquer um dos sliders recalcula os totais e redesenha o gráfico de barras em menos de 16ms (sem engasgos de interface).
3. [x] Em telas de smartphones (390px), os sliders e o gráfico de barras empilhadas se adaptam verticalmente com perfeita legibilidade e alvos de toque $\ge 44$px.
4. [x] O streaming SSE lida graciosamente com a emissão do artefato sem quebrar o Markdown do restante da resposta.
5. [x] Todos os testes existentes em `tests/` continuam passando sem regressões (125/125 aprovados).

---

## 5. Estratégia de Testes

- **Testes Unitários no Backend (`tests/test_generative_ui.py`)**:
  - Testar validação dos schemas Pydantic de cada payload de artefato.
  - Testar cálculos matemáticos de juros compostos, custo de oportunidade e ganho real garantindo precisão determinística.
  - Testar extração do bloco de artefato pelo parser do chat no `smart_router.py`.
- **Testes de Integração de API (`tests/test_api_artifacts.py`)**:
  - Testar o endpoint de chat simulando pergunta que aciona artefato e verificando o formato do evento SSE.
- **Validação Manual de UX no Frontend**:
  - Testar arraste de sliders em navegadores Desktop (Chrome/Firefox/Edge) e Mobile (Safari iOS / Chrome Android).
  - Testar comportamento com valores extremos (ex: aporte 0, taxa 0.1%, prazo 40 anos).

---

## 6. Riscos e Mitigações

| Risco Identificado | Impacto | Mitigação Arquitetural |
| :--- | :--- | :--- |
| Modelos de LLM menores errarem o formato JSON do artefato | Médio | Fallback no SmartRouter com regex tolerante a erros de JSON e schema default pré-preenchido caso campos opcionais faltem. |
| Re-renderizações pesadas no React causarem lentidão ao mover os sliders | Alto | Cálculos matemáticos puros dentro de `useMemo` e uso de SVG leve sem dependências pesadas de bibliotecas externas de gráficos. |
| Falha no streaming quebrar o texto do chat | Médio | Delimitador único de bloco com buffer de streaming que aguarda fechamento do JSON antes de despachar para o renderizador. |

