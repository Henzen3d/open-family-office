# Plano de Implementação — Fase 4: Cross-Border BR/US & Arquitetura Multi-Moeda
## Adaptação Cultural e Flexibilidade Transfronteiriça: Brasil, Expatriados e EUA

> **Documento de Especificação Técnica e Plano de Trabalho**  
> **Arquivo:** `references/melhorias/05_plano_fase4_cross_border_br_us_e_multimoeda.md`  
> **Status:** Concluído e Validado (Testes Backend 100% + Componentes Cross-Border, Toggle PTAX e Build Next.js Verificados)  
> **Prioridade:** P2 (Expansão Global e Suporte a Expatriados)  
> **Estimativa de Esforço:** 3 Semanas

---

## 1. Contexto e Justificativa

Conforme fundamentado no benchmarking global e no modelo arquitetural do plano diretor (`references/melhorias/pesquisa-melhorias.md`, Seção 3), os maiores softwares do mercado sofrem de paroquialismo geográfico:
- **Monarch e Copilot Money** são restritos a contas norte-americanas via Plaid, sem suporte a moedas de mercados emergentes nem ao MEI brasileiro.
- **Mobills e Organizze** são restritos a contas brasileiras em reais (BRL), ignorando investimentos internacionais e contas globais.

O **OpenFamilyOffice** foi concebido para atender com perfeição a **3 perfis geográficos e fiscais**:
1. **O Brasileiro no Brasil**: Focado em BRL, Selic, CDI, IPCA, Tesouro Direto, MEI (LC 123/2006 e LC 238/2026), PIX e IRPF.
2. **O Brasileiro Expatriado / Nômade (Cross-Border)**: Opera com receitas e despesas simultâneas em **BRL e USD**, remessas internacionais (Wise, Nomad, Avenue), risco cambial duplo, formulários W-8BEN, declaração de Saída Definitiva e controle de Carnê-Leão / CBE Bacen.
3. **O Residente / Nativo Americano (US Native)**: Opera em USD, constrói patrimônio em instrumentos com benefícios fiscais agressivos (**401k** com employer match, **Roth IRA**, **HSA** com *triple-tax advantage*), HYSA com seguro FDIC e conformidade com o IRS Form 1040 (Schedule D para ganhos de capital de curto e longo prazo).

A Fase 4 desacopla a moeda e as regras tributárias do núcleo contábil, permitindo ao usuário alternar perfeitamente entre os perfis ou consolidar seu patrimônio global em uma única tela.

---

## 2. Arquitetura Técnica e Arquivos Envolvidos

```
┌────────────────────────────────────────────────────────────────────────┐
│                              BACKEND                                   │
│  src/models/currency.py (NOVO)                                         │
│     ├── CurrencyCode Enum ('BRL', 'USD', 'EUR')                        │
│     └── MultiCurrencyAmount (Valor nativo + taxa PTAX + valor base)    │
│                                                                        │
│  src/engine/forex_cross_border_engine.py (NOVO)                        │
│     ├── PtaxRateService (Taxa oficial PTAX do BCB com cache local)     │
│     ├── RemittanceCalculator (Spread bancário + IOF 1,1% / 0,38%)      │
│     └── CbeBacenMonitor (Monitor de patrimônio no exterior > US$ 1M)  │
│                                                                        │
│  src/engine/us_tax_engine.py (NOVO)                                    │
│     ├── TaxAdvantagedAccounts (401k, Roth IRA, Traditional IRA, HSA)  │
│     └── ScheduleDClassifier (Ganhos Short-Term < 1a vs Long-Term > 1a)│
│                                                                        │
│  src/controller/account_manager.py (MODIFICAR)                         │
│     └── Suporte a moedas nativas nas contas (USD em Avenue/Wise)       │
│                                                                        │
│  src/web/api.py (MODIFICAR)                                            │
│     ├── GET  /api/forex/rates (Cotações e histórico PTAX)             │
│     ├── POST /api/forex/convert (Conversão instantânea com spread)     │
│     └── GET  /api/cross-border/compliance (Radar W-8BEN / CBE / Carnê)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ JSON API
┌───────────────────────────────────▼────────────────────────────────────┐
│                              FRONTEND                                  │
│  web/app/components/cross_border/ (NOVO DIRETÓRIO)                     │
│     ├── CurrencyToggle.tsx (Botão global BRL / USD / DUAL no Header)   │
│     ├── RemittanceCostCalculator.tsx (Simulador Wise vs Avenue)        │
│     ├── UsTaxAdvantagedCard.tsx (Acompanhamento 401k, Roth IRA, HSA)   │
│     └── CrossBorderComplianceRadar.tsx (Status W-8BEN, Carnê, CBE)    │
│                                                                        │
│  web/app/components/SettingsModal.tsx (MODIFICAR)                      │
│     └── Aba de Perfil Fiscal: Seletor (BR Nativo / Expatriado / US)    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Lista Detalhada de Tarefas e Subtarefas

### 3.1 Backend: Multi-Moeda e Regras Cross-Border

- [x] **Tarefa 4.1: Modelagem de Dados Multi-Moeda (`src/models/currency.py`)**  
  - [x] Criar o enum `CurrencyCode` com suporte a `BRL`, `USD` e `EUR`.
  - [x] Criar o modelo `MultiCurrencyAmount(BaseModel)`:
    - `currency`: CurrencyCode.
    - `amount`: Decimal.
    - `ptax_rate`: Optional[Decimal] (taxa de conversão PTAX aplicada).
    - `converted_brl`: Decimal (valor equivalente em reais).
    - `converted_usd`: Decimal (valor equivalente em dólares).
  - [x] Atualizar o modelo de contas bancárias (`BankAccount` em `account_manager.py`) para armazenar o atributo `currency` nativo (ex: Conta Inter PJ = `BRL`, Conta Wise/Nomad = `USD`).

- [x] **Tarefa 4.2: Motor de Câmbio e Remessas (`src/engine/forex_cross_border_engine.py`)**  
  - [x] Integrar com `src/intelligence/bcb_client.py` para consulta diária automática da cotação de fechamento da PTAX (compra e venda).
  - [x] Implementar cache local de taxas históricas em `data/macro_cache/ptax_history.json`.
  - [x] Implementar a classe `RemittanceCalculator`:
    - Simula envio Brasil $\rightarrow$ EUA e EUA $\rightarrow$ Brasil.
    - Calcula o IOF vigente (1,1% para conta de mesma titularidade, 0,38% para terceiros/investimentos).
    - Calcula o spread comercial das plataformas (Wise ~1,2%, Nomad ~1,5% a 2%, bancos tradicionais ~3% a 4%).
    - Retorna o VET (Valor Efetivo Total) da operação.
  - [x] Implementar a classe `CbeBacenMonitor`:
    - Soma todos os saldos e ativos mantidos no exterior em USD.
    - Se a soma ultrapassar o teto anual de US$ 1.000.000,00, ativa o alerta compulsório da declaração de Capitais Brasileiros no Exterior (CBE Bacen).

- [x] **Tarefa 4.3: Motor Tributário Norte-Americano (`src/engine/us_tax_engine.py`)**  
  - [x] Implementar `TaxAdvantagedAccountsTracker`:
    - Rastreamento dos limites anuais de contribuição oficiais do IRS:
      - 401(k): teto anual do empregado + cálculo de matching corporativo (ex: "50% match até 6% do salário").
      - Roth IRA / Traditional IRA: teto anual de contribuição + limite de elegibilidade por renda bruta ajustada (MAGI).
      - HSA (Health Savings Account): limites para cobertura individual vs familiar (com dedutibilidade tripla: aporte isento, crescimento isento e saque médico isento).
  - [x] Implementar `ScheduleDClassifier`:
    - Analisa vendas de ativos de investimento:
      - Se o período de posse for $< 1 \text{ ano}$: classifica como *Short-Term Capital Gain* (tributado pela alíquota ordinária de renda).
      - Se o período de posse for $\ge 1 \text{ ano}$: classifica como *Long-Term Capital Gain* (tributado com alíquotas favorecidas de 0%, 15% ou 20%).
  - [x] Implementar o `W8BenMonitor`:
    - Registra a data de assinatura do formulário W-8BEN (validade legal de 3 anos civis).
    - Avisa o usuário com 60 dias de antecedência para renovar o documento na corretora americana e não sofrer bitributação.

- [x] **Tarefa 4.4: Expandir os Endpoints em `src/web/api.py`**  
  - [x] `GET /api/forex/overview`: Retorna as cotações oficiais vigentes de PTAX, Dólar Comercial e Euro com variação percentual do dia.
  - [x] `POST /api/forex/convert`: Converte valores monetários aplicando a taxa do dia ou data histórica específica.
  - [x] `GET /api/cross-border/compliance`: Retorna o status de conformidade fiscal cruzada (validade W-8BEN, alerta Carnê-Leão se houver receitas do exterior em BRL sem DARF, e status CBE).

---

### 3.2 Frontend: Interface Multi-Moeda e Painéis Cross-Border

- [x] **Tarefa 4.5: Desenvolver o Seletor Global de Moeda (`CurrencyToggle.tsx`)**  
  - [x] Criar `web/app/components/cross_border/CurrencyToggle.tsx` no Header principal do dashboard:
    - 3 Posições: `[ R$ BRL ]` | `[ $ USD ]` | `[ Dupla Moeda ]`.
    - Ao selecionar BRL: todos os saldos e gráficos consolidam em Reais usando a taxa PTAX.
    - Ao selecionar USD: todos os saldos consolidam em Dólar.
    - Ao selecionar Dupla Moeda: os cards exibem o valor primário em BRL e um subtexto em JetBrains Mono com o equivalente em USD: `R$ 458.122,34 (~$ 78.986,61)`.
  - [x] Persistir a preferência no `localStorage` e nos settings do usuário.

- [x] **Tarefa 4.6: Desenvolver o Card de Contas Americanas e Previdência (`UsTaxAdvantagedCard.tsx`)**  
  - [x] Criar `web/app/components/cross_border/UsTaxAdvantagedCard.tsx`:
    - Barras de progresso com os tetos anuais de contribuição do IRS:
      - 401(k) Contribuído no ano vs Teto Máximo.
      - Roth IRA Contribuído vs Teto Máximo.
      - HSA Contribuído vs Teto Máximo.
    - Cálculo visual de benefício fiscal acumulado (imposto federal diferido ou isenção futura).

- [x] **Tarefa 4.7: Desenvolver o Simulador de Remessas e VET (`RemittanceCostCalculator.tsx`)**  
  - [x] Criar `web/app/components/cross_border/RemittanceCostCalculator.tsx`:
    - Slider de valor a transferir (ex: R$ 5.000 ou $ 2.000).
    - Comparativo de custos em tabela transparente:
      - Provedor (Wise vs Nomad vs Avenue vs Banco Tradicional).
      - Spread aplicado sobre a PTAX.
      - Valor do IOF retido.
      - Valor líquido que cai na conta destino em dólares.

- [x] **Tarefa 4.8: Desenvolver o Radar de Conformidade Fiscal Cruzada (`CrossBorderComplianceRadar.tsx`)**  
  - [x] Criar `web/app/components/cross_border/CrossBorderComplianceRadar.tsx`:
    - Alerta de Validade W-8BEN: data da última renovação e contagem regressiva para expiração.
    - Alerta Carnê-Leão: Identifica transferências de contas externas recebidas no Brasil e calcula o DARF devido no mês subsequente.
    - Medidor CBE Bacen: Barra percentual de proximidade do teto de US$ 1 milhão.

- [x] **Tarefa 4.9: Integrar a Seleção de Perfil Fiscal no `SettingsModal.tsx`**  
  - [x] Modificar `web/app/components/SettingsModal.tsx` para adicionar uma nova aba: **"Perfil Fiscal & Regional"**:
    - Radio selector:
      - 🇧🇷 *Brasileiro no Brasil (Foco MEI, Selic, IRPF)*
      - 🌎 *Expatriado / Cross-Border (Dupla Moeda, PTAX, Remessas, W-8BEN)*
      - 🇺🇸 *Residente / Nativo EUA (USD, 401k, Roth IRA, HSA, IRS 1040)*
    - A escolha do perfil ajusta dinamicamente os widgets visíveis no dashboard para não poluir a tela com ferramentas irrelevantes para o usuário no momento.

---

## 4. Critérios de Aceitação e Definição de Pronto (DoD)

1. [x] Clicar no botão `[ $ USD ]` no cabeçalho converte instantaneamente todos os saldos de contas em reais para dólares americanos usando a cotação PTAX mais recente do Banco Central.
2. [x] Contas abertas no exterior (ex: Avenue ou Nomad) podem ser cadastradas com moeda nativa USD, e suas transações não sofrem conversão forçada na conciliação contábil.
3. [x] O simulador de remessas calcula o IOF exato de acordo com a finalidade (1,1% para mesma titularidade vs 0,38% para investimentos).
4. [x] O perfil fiscal selecionado no SettingsModal oculta ou exibe os módulos correspondentes (ex: oculta MEI se o usuário for US Native; oculta 401k se for BR Nativo).
5. [x] Todos os testes do repositório continuam 100% aprovados (147/147 passando).

---

## 5. Estratégia de Testes

- **Testes Unitários (`tests/test_cross_border_engine.py`)**:
  - Testar conversão de BRL para USD e vice-versa com taxas PTAX variadas.
  - Testar cálculo do VET e IOF em remessas.
  - Testar validação dos limites de contribuição 401(k), IRA e HSA com regras de idade (> 50 anos com *catch-up contribution*).
  - Testar classificação de ganhos de capital Schedule D por período de guarda (364 dias = short-term, 365 dias = long-term).
- **Testes de API (`tests/test_api_cross_border.py`)**:
  - Testar endpoints `/api/forex/*` com dados em cache e chamada à API do Bacen.

---

## 6. Riscos e Mitigações

| Risco Identificado | Impacto | Mitigação Arquitetural |
| :--- | :--- | :--- |
| Mudança anual nos tetos e regras do IRS americano (401k/IRA/HSA) | Médio | Criar arquivo de configuração externa `config/us_tax_brackets.json` versionado por ano fiscal, desacoplado do código-fonte Python. |
| Variação intradiária de câmbio causar divergência no balanço | Baixo | Uso da PTAX oficial diária de fechamento como convenção contábil única para reconciliação patrimonial. |

