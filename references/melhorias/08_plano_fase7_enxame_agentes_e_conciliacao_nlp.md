# Fase 7 — Arquitetura de Enxame de Agentes (Swarm) & Conciliação Inteligente NLP

## 1. Contexto e Diagnóstico do Desafio

O usuário apresentou a seguinte dor real no OpenFamilyOffice:
> *"a nossa contabilidade é uma bagunça e quero que com esse sistema aos poucos as contas comecem a fechar... o valor que temos hoje no sistema de R$ 508.121,36 não fecha pois temos muitas contas que foram pagas mas que não lancei, como por exemplo mercado e outros, talvez podemos usar uma média de meses que estão lançados e seja lançado uma estimativa de gastos para não ficar tão falho os valores, mas de qualquer forma ficar em aberto para no futuro fazer o lançamento correto dos gastos e compras."*

Além disso, solicitou 4 capacidades operacionais diretas no chat:
1. **Lançamento em Linguagem Natural**: Dizer *"Ganhei R$100,00 em um atendimento na Fix Serviços instalando uma lâmpada"* e registrar no livro-razão como receita da entidade correta.
2. **Atualização em Lote de Saldos Bancários**: Enviar uma lista de saldos por banco no chat e sincronizar o `AccountManager`.
3. **Ingestão de Carteira de Ações Americanas (US Stocks)**: Enviar lista de tickers e corretora (ex: Avenue, Nomad, Schwab) e contabilizar em USD e BRL via PTAX oficial.
4. **Reconstituição / Provisão de Gastos Estimados**: Preencher meses com lacunas com base na média histórica dos meses lançados, com status auditável `ESTIMATED`.

---

## 2. Arquitetura do Enxame de Agentes (Agent Swarm)

Se implementássemos um enxame dedicado no OpenFamilyOffice, a governança seria distribuída entre **6 agentes especializados**, comunicando-se de forma assíncrona com papéis estritos:

```
                              ┌──────────────────────────────────┐
                              │     COORDINATOR / ORCHESTRATOR    │
                              │     (OpenFamilyOffice Core)       │
                              └─────────────────┬────────────────┘
                                                │
         ┌──────────────────┬───────────────────┼───────────────────┬──────────────────┐
         │                  │                   │                   │                  │
         ▼                  ▼                   ▼                   ▼                  ▼
┌─────────────────┐┌─────────────────┐┌─────────────────┐┌─────────────────┐┌─────────────────┐
│ 1. RECONCILER   ││ 2. NLP INTAKE   ││ 3. BANK SYNC    ││ 4. US PORTFOLIO ││ 5. HISTORIAN   │
│ Auditor de Caixa││ Conversão Chat- ││ Ajuste em Lote  ││ Ações EUA, PTAX ││ Estimador de   │
│ & Gap Contábil  ││ to-Ledger       ││ de Saldos       ││ & Compliance    ││ Meses Vazios   │
└─────────────────┘└─────────────────┘└─────────────────┘└─────────────────┘└─────────────────┘
                                                │
                                                ▼
                                      ┌───────────────────┐
                                      │ 6. MEI GUARDIAN   │
                                      │ Teto LC 123/2006  │
                                      │ & Blindagem PF/PJ │
                                      └───────────────────┘
```

### Detalhamento dos Agentes do Enxame:

1. **Agente Reconciliador de Caixa (Auditor-Geral)**:
   - **Missão**: Fazer as contas "fecharem" progressivamente.
   - **Operação**: Calcula em tempo real o *gap patrimonial*:
     $$\text{Gap} = \text{Saldo das Contas Bancárias} - (\text{Saldo Inicial} + \sum \text{Receitas} - \sum \text{Despesas})$$
   - Aponta exatamente quantos reais faltam justificar e alerta sobre inconsistências entre extratos bancários e notas fiscais.

2. **Agente NLP Intake (Chat-to-Ledger)**:
   - **Missão**: Eliminar o atrito de digitação manual de notas fiscais e despesas cotidianas.
   - **Operação**: Extrai entidades brasileiras (Fix Serviços MEI, Facilita Vistorias MEI, Família Osmar & Vera), valores monetários em R$, descrição, categoria contábil e método de pagamento.
   - Suporta **Receitas** (atendimentos, serviços, reembolsos) e **Despesas** (supermercado, materiais, combustíveis).
   - Apresenta Cartão Interativo de Confirmação antes de persistir no banco WAL.

3. **Agente Bank Sync (Sincronizador em Lote)**:
   - **Missão**: Permitir que o usuário copie e cole os saldos das suas contas e o sistema faça o batimento imediato.
   - **Operação**: Faz correspondência difusa (*fuzzy matching*) de nomes de bancos (Nubank, Inter, Caixa, Itaú, Bradesco, etc.) e registra os novos saldos na trilha auditada `balance_adjustments.jsonl`.

4. **Agente US Portfolio & Câmbio PTAX**:
   - **Missão**: Integrar ativos globais denominados em dólar (USD).
   - **Operação**: Lê listas de ações (ex: AAPL, NVDA, TSLA, VT) e corretoras (Avenue, Nomad, Charles Schwab), consulta a cotação e a taxa oficial PTAX do Banco Central, calcula o valor consolidado em BRL e monitora exigências legais (declaração de Capitais Brasileiros no Exterior - CBE Bacen).

5. **Agente Historiador & Estimador de Gastos**:
   - **Missão**: Sanar a falha dos meses sem lançamentos sem inventar dados arbitrários.
   - **Operação**:
     - Analisa os meses que possuem dados confiáveis (ex: alimentação no Giassi média de R$ 1.800/mês, energia R$ 350/mês, internet R$ 120/mês).
     - Identifica os meses do histórico com lacunas.
     - Cria lançamentos provisórios marcados como `reconciliation_status = "ESTIMATED"`.
     - Permite que esses lançamentos sejam substituídos progressivamente à medida que cupons ou faturas reais forem inseridos.

6. **Agente Guardião MEI & Blindagem Patrimonial**:
   - **Missão**: Garantir que as receitas lançadas na Fix Serviços (Osmar) ou Facilita Vistorias (Vera) não ultrapassem o limite de R$ 81.000,00 anuais por CNPJ (LC 123/2006).

---

## 3. Plano de Implementação Técnica

### Tarefas da Fase 7:
- [x] **Subtarefa 7.1**: Criar modelo de dados e repositório de carteira de ações americanas (`src/models/portfolio.py` e `src/controller/portfolio_manager.py`).
- [x] **Subtarefa 7.2**: Implementar motor estatístico de estimativa e recomposição de lacunas contábeis (`src/engine/expense_estimator.py`).
- [x] **Subtarefa 7.3**: Criar analisador NLP financeiro polivalente (`src/intelligence/nlp_transaction_parser.py`) capaz de processar receitas, despesas, listas de saldos, listas de ações e comandos de estimativa.
- [x] **Subtarefa 7.4**: Integrar os novos fluxos no `SmartRouter` (`src/llm/smart_router.py`) e no `chat_router.py`.
- [x] **Subtarefa 7.5**: Suportar lançamentos positivos (receitas) no endpoint de confirmação do livro-razão (`/api/ledger/confirm-card`).
- [x] **Subtarefa 7.6**: Implementar endpoints de portfólio US e estimativa de gastos no backend FastAPI.
- [x] **Subtarefa 7.7**: Atualizar a interface do chat (`AssistantDrawer.tsx` e `ArtifactRenderer.tsx`) com renderizadores visuais para receitas, saldos e carteira.
- [x] **Subtarefa 7.8**: Criar testes automatizados para os novos motores e validar a suíte completa de testes.

