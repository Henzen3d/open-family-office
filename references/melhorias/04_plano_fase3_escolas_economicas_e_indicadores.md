# Plano de Implementação — Fase 3: As 5 Escolas Econômicas & Indicadores de Proteção
## O Alicerce Filosófico e Macroeconômico: Protegendo e Multiplicando o Patrimônio Familiar

> **Documento de Especificação Técnica e Plano de Trabalho**  
> **Arquivo:** `references/melhorias/04_plano_fase3_escolas_economicas_e_indicadores.md`  
> **Status:** Concluído e Validado (Testes Backend 100% + Componentes Bento Grid e Build Next.js Verificados)  
> **Prioridade:** P1 (Fundamentação Intelectual e Blindagem Familiar)  
> **Estimativa de Esforço:** 2 Semanas

---

## 1. Contexto e Justificativa

Conforme sustentado no documento diretor (`references/melhorias/pesquisa-melhorias.md`, Seção 4), a maioria das famílias perde patrimônio ao longo do tempo não por falta de trabalho ou renda, mas pela **ausência de um arcabouço conceitual sólido contra a inflação contínua, os impostos, os litígios jurídicos e a própria psicologia humana**.

A maioria dos softwares de controle financeiro trata todo centavo de forma indiferenciada: R$ 10.000 parados na conta corrente recebem a mesma classificação visual que R$ 10.000 em um imóvel próprio ou ouro físico. Isso cria uma perigosa **ilusão monetária nominal**.

A Fase 3 materializa as teorias comprovadas das **cinco grandes escolas de pensamento econômico** em indicadores visuais no dashboard, travas comportamentais determinísticas e regras de proteção patrimonial:
1. **Escola Austríaca (Mises, Hayek)**: Escudo contra a desvalorização de moedas fiduciárias via *Hard Asset Ratio*.
2. **Economia Comportamental (Kahneman, Thaler)**: Domando o viés do presente com o *Colchão de Tranquilidade (2 a 5 anos)* e o *Cooling-Off Lock*.
3. **Escola Monetarista (Milton Friedman)**: Vigilância obsessiva do *Retorno Real Líquido* e *Monitor de Poder de Compra em Cestas Reais*.
4. **Economia Institucionalista (Douglass North)**: Blindagem jurídica e checklist de respeito a contratos e sucessão.
5. **Economia Neoclássica (Alfred Marshall, Irving Fisher)**: Otimização da preferência temporal com cálculo ativo de juros compostos.

---

## 2. Arquitetura Técnica e Arquivos Envolvidos

```
┌────────────────────────────────────────────────────────────────────────┐
│                              BACKEND                                   │
│  src/engine/economic_schools_evaluator.py (NOVO)                      │
│     ├── HardAssetCalculator (Ativos Reais vs Fiduciários)              │
│     ├── BehavioralCushionCalculator (2 a 5 anos de despesas)          │
│     ├── RealReturnEngine (Filtro mandatório de inflação IPCA/CPI)     │
│     ├── PurchasingPowerEngine (Cestas básicas e m² imobiliário)       │
│     └── EconomicScorecardEvaluator (Nota de saúde patrimonial 0-100)  │
│                                                                        │
│  src/web/api.py (MODIFICAR)                                            │
│     ├── GET /api/economic-schools/scorecard (Indicadores consolidados) │
│     └── GET /api/economic-schools/purchasing-power (Série histórica)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ JSON API
┌───────────────────────────────────▼────────────────────────────────────┐
│                              FRONTEND                                  │
│  web/app/components/economic_schools/ (NOVO DIRETÓRIO)                 │
│     ├── EconomicScorecardCard.tsx (Radar pentagonal ou 5 pilares)     │
│     ├── HardAssetRatioGauge.tsx (Gauge de ativos reais)                │
│     ├── BehavioralCushionProgress.tsx (Barra de 2 a 5 anos)            │
│     ├── RealReturnBadge.tsx (Badge mandatório de rentabilidade real)   │
│     └── PurchasingPowerChart.tsx (Gráfico em cestas de consumo)        │
│                                                                        │
│  web/app/page.tsx (MODIFICAR)                                          │
│     └── Inclusão do Scorecard de Escolas Econômicas no Bento Grid      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Lista Detalhada de Tarefas e Subtarefas

### 3.1 Backend: Motor de Avaliação das Escolas Econômicas

- [x] **Tarefa 3.1: Criar o Arquivo `src/engine/economic_schools_evaluator.py`**  
  - [x] Implementar a classe `HardAssetCalculator` (Escola Austríaca):
    - Classificar os ativos cadastrados em duas categorias:
      - *Hard Assets* (Ativos Escassos/Reais): Imóveis próprios quitados, terras, participações societárias ativas, ouro/metais e ativos de emissão estrita (Bitcoin).
      - *Paper Assets / Fiat*: Depósitos bancários em conta corrente, cédulas, títulos fiduciários sem indexação inflacionária.
    - Calcular o **Hard Asset Ratio**:
      $$\text{Hard Asset Ratio} = \frac{\sum \text{Hard Assets}}{\text{Patrimônio Líquido Total}} \times 100$$
    - Definir limiar saudável recomendado para a família (ex: mínimo de 40% a 70% do patrimônio líquido alocado em ativos reais).
    - Emitir alerta de "Perda de Soberania Monetária" se o saldo em papel fiduciário não remunerado exceder 60 dias de despesas familiares.
    - Implementar detecção de "Dívidas Destrutivas" (rotativo de cartão, cheque especial ou empréstimos com taxa superior ao CDI).

  - [x] Implementar `BehavioralCushionCalculator` (Economia Comportamental):
    - Conectar com `src/engine/runway.py` para obter o `monthly_essential_burn` (custo de vida essencial da família).
    - Diferenciar a "Reserva de Emergência Convencional" (6 meses) do **"Colchão de Tranquilidade Comportamental" (2 a 5 anos)**.
    - Calcular o status do colchão:
      $$\text{Cushion (meses)} = \frac{\text{Liquidez Segura (Renda Fixa D+0 / Tesouro Selic)}}{\text{Gasto Mensal Essencial}}$$
    - Classificar o status:
      - $< 12 \text{ meses}$: ⚠️ Zona de Vulnerabilidade Comportamental (alto risco de pânico em crises).
      - $12 \text{ a } 24 \text{ meses}$: 🟡 Reserva Estável.
      - $24 \text{ a } 60 \text{ meses}$: 🛡️ Blindagem Comportamental Plena (independência psicológica para atravessar mercados em baixa).

  - [x] Implementar `RealReturnEngine` (Escola Monetarista):
    - Conectar com `src/intelligence/bcb_client.py` para recuperar o IPCA acumulado de 12 meses e séries históricas.
    - Proibir terminantemente o retorno puramente nominal: criar função utilitária `format_real_return(nominal_rate, ipca_period)` que calcula:
      $$r_{\text{real}} = \frac{1 + r_{\text{nominal}}}{1 + \text{IPCA}} - 1$$
    - Retornar objeto com a decomposição: ganho nominal bruto, desconto de imposto de renda estimado, desconto de inflação e o ganho real líquido.

  - [x] Implementar `PurchasingPowerEngine` (Escola Monetarista):
    - Manter tabela de referência de preços reais ao longo do tempo (Cesta Básica DIEESE média nacional, m² imobiliário residencial médio, mensalidade escolar média).
    - Calcular o patrimônio histórico não apenas em BRL/USD, mas convertido em unidades de cestas de consumo essenciais.

  - [x] Implementar `InstitutionalSafetyEvaluator` (Escola Institucionalista):
    - Auditar se a segregação contábil PF vs PJ está com 100% de integridade (usando dados de `transfer_neutralizer.py`).
    - Checklist booleano de conformidade legal: Escrituras registradas, Contratos Sociais atualizados, Pacto antenupcial regular e Declarações MEI em dia.

  - [x] Implementar `EconomicScorecardEvaluator`:
    - Algoritmo que sintetiza os 5 pilares em uma pontuação ponderada de 0 a 100 para a família:
      - Pilar 1 (Austríaco - Hard Assets): 20 pts.
      - Pilar 2 (Comportamental - Colchão 2-5a): 25 pts.
      - Pilar 3 (Monetarista - Ganho Real > 0): 20 pts.
      - Pilar 4 (Institucionalista - Blindagem Jurídica): 20 pts.
      - Pilar 5 (Neoclássico - Disciplina de Aportes): 15 pts.

- [x] **Tarefa 3.2: Criar os Endpoints REST em `src/web/api.py`**  
  - [x] `GET /api/economic-schools/scorecard`: Retorna o scorecard das 5 escolas com notas, status e recomendações de melhoria.
  - [x] `GET /api/economic-schools/purchasing-power`: Retorna a evolução histórica do poder de compra real da família.

---

### 3.2 Frontend: Indicadores e Painéis no Dashboard

- [x] **Tarefa 3.3: Criar o Componente `EconomicScorecardCard.tsx`**  
  - [x] Criar `web/app/components/economic_schools/EconomicScorecardCard.tsx`:
    - Card executivo exibindo a nota geral da família (ex: 84/100 • *"Patrimônio Fortificado"*).
    - 5 Barras horizontais de progresso ou gráfico pentagonal estilizado com as 5 escolas:
      1. Austríaca (Hard Assets).
      2. Comportamental (Colchão de Tranquilidade).
      3. Monetarista (Defesa da Inflação).
      4. Institucionalista (Segurança Legal).
      5. Neoclássica (Aporte & Juros Compostos).
    - Tooltip detalhado em cada barra explicando a teoria e o que falta para atingir nota máxima.

- [x] **Tarefa 3.4: Criar o Componente `BehavioralCushionProgress.tsx`**  
  - [x] Criar `web/app/components/economic_schools/BehavioralCushionProgress.tsx`:
    - Visualizador linear estilizado com marcadores:
      - [0 meses] $\rightarrow$ [6 meses: Emergência básica] $\rightarrow$ [24 meses: Colchão Mínimo] $\rightarrow$ [60 meses: Liberdade Total].
    - Exibe o valor total da reserva líquida e o equivalente exato em anos e meses de custo de vida pago sem depender de renda ativa.
    - Frase de reforço comportamental: *"Com 38 meses de colchão, a família pode atravessar recessões sem vender nenhum ativo produtivo em pânico."*

- [x] **Tarefa 3.5: Criar o Componente `HardAssetRatioGauge.tsx`**  
  - [x] Criar `web/app/components/economic_schools/HardAssetRatioGauge.tsx`:
    - Gráfico semicircular (gauge) ou barra bicolor contrastante:
      - Verde/Âmbar: Ativos Reais (Imóveis, Ouro, Cripto de suprimento fixo, Participação MEI).
      - Cinza escuro: Depósitos fiduciários e contas correntes.
    - Percentual atual em destaque com o status: *"Proteção Inflacionária Ótima"* ou *"Excesso de Caixa Fiduciário"*.

- [x] **Tarefa 3.6: Criar o Componente `PurchasingPowerChart.tsx`**  
  - [x] Criar `web/app/components/economic_schools/PurchasingPowerChart.tsx`:
    - Gráfico interativo com seletor de unidade de medida real:
      - "Em Cestas Básicas" (ex: 2.450 cestas em 2024 $\rightarrow$ 2.780 cestas em 2026).
      - "Em m² de Imóveis" (ex: 78 m² equivalentes $\rightarrow$ 92 m² equivalentes).
      - "Em Salários Mínimos".
    - Demonstração empírica de que a família está de fato acumulando riqueza real e não apenas números inflacionados pela emissão monetária.

- [x] **Tarefa 3.7: Integrar os Novos Indicadores ao Bento Grid do `page.tsx`**  
  - [x] Modificar `web/app/page.tsx` para adicionar o novo card de Saúde Macroeconômica das 5 Escolas no Bento Grid principal.
  - [x] Adicionar badges de Rentabilidade Real em todos os cards que exibem rendimentos de aplicações bancárias.

---

## 4. Critérios de Aceitação e Definição de Pronto (DoD)

1. [x] Todo e qualquer indicador de rentabilidade no dashboard que exiba taxa percentual passa a exibir, ao lado ou em destaque principal, o **ganho real líquido** com a anotação `(Real líquido de IPCA: +X,XX%)`.
2. [x] O indicador do Colchão de Tranquilidade Comportamental calcula o número exato de meses com base nos dados reais do livro-razão e despesas essenciais consolidadas.
3. [x] O Scorecard das 5 Escolas gera nota numérica e diagnóstico explicativo sem alucinações de IA, operado 100% por regras matemáticas no backend.
4. [x] O gráfico de Poder de Compra permite alternar entre Moeda Nominal e Cesta de Bens Reais.
5. [x] Todos os testes automatizados continuam íntegros e passando (139/139 aprovados).

---

## 5. Estratégia de Testes

- **Testes Unitários (`tests/test_economic_schools.py`)**:
  - Testar cálculo do Hard Asset Ratio com diferentes carteiras e moedas.
  - Testar fórmula de Fisher para desconto de inflação e impostos, inclusive em cenários de deflação ou inflação elevada.
  - Testar cálculo do colchão comportamental com gastos variáveis.
  - Testar a pontuação de 0 a 100 do Scorecard em cenários simulados (família endividada vs família blindada).
- **Testes de API (`tests/test_api_economic_schools.py`)**:
  - Testar endpoints do scorecard garantindo resposta em $< 50$ms a partir do cache de dados.

---

## 6. Riscos e Mitigações

| Risco Identificado | Impacto | Mitigação Arquitetural |
| :--- | :--- | :--- |
| Ausência de dados de inflação se a API do Banco Central estiver fora do ar | Médio | Fallback automático para o cache local de macroeconomia (`data/macro_cache/`) com aviso discreto da data do último dado oficial. |
| O conceito de "Hard Assets" gerar dúvidas na família | Baixo | Tooltips educativos com linguagem simples e acessível orientando o que constitui um ativo real e por que ele protege contra a desvalorização cambial. |

