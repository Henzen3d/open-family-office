# Plano de Implementação — Fase 2: Strategy Hub & Simuladores de Decisão
## Central de Estratégias Proativas: A IA Orientando Decisões Reais da Família

> **Documento de Especificação Técnica e Plano de Trabalho**  
> **Arquivo:** `references/melhorias/03_plano_fase2_strategy_hub_e_simuladores.md`  
> **Status:** Pronto para Implementação Posterior  
> **Prioridade:** P0 (Diferencial Competitivo Essencial)  
> **Estimativa de Esforço:** 2 Semanas

---

## 1. Contexto e Justificativa

Conforme detalhado no documento diretor (`references/melhorias/pesquisa-melhorias.md`), os aplicativos tradicionais sofrem do vício de "olhar apenas no retrovisor": registram despesas já consumadas, mas não ajudam a família a tomar decisões cruciais sobre o futuro.

O usuário demandou expressamente:
> *"Uma área dedicada onde a IA sugere estratégias sobre o que o usuário deve fazer, analisando cenários concretos da vida real: comprar uma casa, comprar um carro ou comprar um celular."*

O **Strategy Hub (Central de Estratégias & Decisões)** preenche exatamente essa lacuna. Ele transforma o OpenFamilyOffice em um **consultor de patrimônio ativo**, composto por 3 camadas operacionais:
1. **Radar Proativo de Oportunidades**: Auditoria contínua e sem necessidade de comando do usuário sobre saldos ociosos, tetos fiscais do MEI e despesas recorrentes.
2. **Simuladores de Grandes Decisões da Vida Real**: Ferramentas interativas dedicadas para comparar compra de Carro (TCO), Casa Própria vs Aluguel, e Celular/Eletrônicos.
3. **Comitê Consultivo Virtual Multi-Escolas**: Parecer estruturado sob a ótica das 5 grandes escolas econômicas antes de fechar um grande compromisso financeiro.

---

## 2. Arquitetura Técnica e Arquivos Envolvidos

```
┌────────────────────────────────────────────────────────────────────────┐
│                              BACKEND                                   │
│  src/engine/strategy_engine.py (NOVO)                                  │
│     ├── OpportunityScanner (Caixa ocioso, Teto MEI, Dívidas)          │
│     ├── CarTCOCalculator (Custo Total de Posse de Veículos)           │
│     ├── MortgageVsRentCalculator (Curvas patrimoniais de 30 anos)     │
│     └── GadgetPurchaseCalculator (À vista vs Prazo + Oportunidade)    │
│                                                                        │
│  src/web/api.py (MODIFICAR)                                            │
│     ├── GET  /api/strategy/opportunities (Radar de alertas proativos) │
│     ├── POST /api/strategy/simulate/car (Simulação de carro)          │
│     ├── POST /api/strategy/simulate/real-estate (Simulação de imóvel) │
│     └── POST /api/strategy/advisory-council (Parecer das 5 escolas)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ JSON API
┌───────────────────────────────────▼────────────────────────────────────┐
│                              FRONTEND                                  │
│  web/app/strategy/page.tsx (NOVA TELA / ROTA)                         │
│     ├── OpportunityRadarView.tsx (Cards de alertas proativos)         │
│     ├── CarSimulatorCard.tsx (Simulador TCO com sliders)              │
│     ├── HomeVsRentCard.tsx (Gráfico comparativo de patrimônio líquido)│
│     ├── GadgetOpportunityCard.tsx (Celular à vista vs a prazo)        │
│     └── MultiSchoolCouncilCard.tsx (Parecer das 5 escolas econômicas) │
│                                                                        │
│  web/app/components/Sidebar.tsx / Navigation (MODIFICAR)               │
│     └── Link direto para a nova rota /strategy                         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Lista Detalhada de Tarefas e Subtarefas

### 3.1 Backend: Motores Estratégicos Determinísticos

- [ ] **Tarefa 2.1: Criar o Motor `src/engine/strategy_engine.py`**  
  - [ ] Implementar a classe `OpportunityScanner`:
    - `scan_idle_cash(accounts_data, selic_rate)`: Identifica contas com saldo acima da reserva operacional (ex: > R$ 5.000 em conta corrente comum que não rende) e calcula quanto a família está deixando de ganhar por mês caso aloque em Tesouro Selic / CDB 100% CDI.
    - `scan_mei_tax_ceiling(revenue_fix, revenue_facilita)`: Monitora a proximidade do teto de R$ 81.000,00 (ou novas faixas da LC 238/2026). Se um MEI atingir > 80% do teto, gera recomendação proativa de redirecionar faturamento para o segundo CNPJ da família.
    - `scan_recurring_subscriptions(transactions_data)`: Detecta despesas recorrentes mensais sem uso recente e quantifica a economia anualizada caso canceladas.
  - [ ] Implementar `CarTCOCalculator`:
    - Entradas: valor de compra, valor de entrada, taxa de financiamento (CET), consumo médio (km/l), km rodado/mês, preço do combustível, valor do seguro e IPVA estimado.
    - Saídas: Custo mensal real discriminado (Parcela + Depreciação FIPE estimada em 10% a.a. + Manutenção + Seguro + Impostos + Combustível).
    - Comparativo: Cenário A (Comprar o carro novo agora) vs Cenário B (Manter o veículo atual por mais 2 anos e investir a diferença de custo mensal).
  - [ ] Implementar `MortgageVsRentCalculator`:
    - Entradas: valor do imóvel, entrada, taxa de juros anual do financiamento, prazo (ex: 360 meses), aluguel mensal de imóvel similar, valorização anual estimada do imóvel, rentabilidade líquida da carteira de investimentos.
    - Saídas: Séries anuais de Patrimônio Líquido acumulado nas duas opções:
      - *Opção Comprar*: Valor de mercado do imóvel menos saldo devedor restante.
      - *Opção Alugar*: Carteira acumulada investindo o valor da entrada inicial mais a diferença mensal entre a parcela do financiamento + custos de manutenção/condomínio e o valor do aluguel.
    - Ponto de Equilíbrio (*Break-even*): Ano exato em que uma curva cruza a outra.
  - [ ] Implementar `MultiSchoolAdvisoryEvaluator`:
    - Função que recebe o resumo de uma proposta financeira (ex: compra de carro de R$ 120.000) e formula os pareceres padronizados de cada escola econômica.

- [ ] **Tarefa 2.2: Criar os Endpoints REST em `src/web/api.py`**  
  - [ ] `GET /api/strategy/opportunities`: Retorna a lista de oportunidades auditadas (cards de alertas proativos com economia potencial calculada).
  - [ ] `POST /api/strategy/simulate/car`: Executa o cálculo determinístico de TCO para veículos.
  - [ ] `POST /api/strategy/simulate/real-estate`: Executa o cálculo determinístico imobiliário de 30 anos.
  - [ ] `POST /api/strategy/advisory-council`: Invoca o SmartRouter para sintetizar a recomendação das 5 escolas com base no perfil financeiro real da família.

---

### 3.2 Frontend: Interface da Central de Estratégias (`/strategy`)

- [ ] **Tarefa 2.3: Criar a Rota e Layout de `web/app/strategy/page.tsx`**  
  - [ ] Criar a página `web/app/strategy/page.tsx` integrada ao tema visual escuro/claro existente.
  - [ ] Implementar o seletor de abas superiores:
    1. **"Radar Proativo"** (Oportunidades automáticas de economia e rentabilidade).
    2. **"Grandes Compras"** (Simuladores de Celular, Carro e Imóvel).
    3. **"Conselho Consultivo"** (Avaliação das 5 escolas econômicas para planos familiares).
  - [ ] Adicionar atalho de acesso rápido no Header e na barra de navegação lateral (`Sidebar.tsx`) com ícone de bússola/alvo (`Compass` ou `Target` do Lucide).

- [ ] **Tarefa 2.4: Desenvolver o Painel "Radar Proativo de Oportunidades"**  
  - [ ] Criar `OpportunityRadarView.tsx`:
    - Card de Caixa Ocioso: *"R$ 24.000 parados na conta corrente da Caixa sem rendimento. Movê-los para o Tesouro Selic gerará R$ 225 líquidos por mês sem risco."* Botão de ação: *"Ver simulação de alocação"*.
    - Card de Gestão Tributária MEI: *"Fix MEI atingiu R$ 68.000 faturados (84% do teto). Redirecione novos serviços para Facilita MEI."* Barra de progresso visual colorida.
    - Card de Trava de Reflexão Ativa: Lista de itens que o casal colocou em *Cooling-Off*, exibindo dias restantes e botão *"Liberar para compra"* ou *"Desistir e investir"*.

- [ ] **Tarefa 2.5: Desenvolver os Simuladores Interativos de Grandes Compras**  
  - [ ] **Simulador 1: Compra de Celular / Eletrônicos (`GadgetOpportunityCard.tsx`)**:
    - Input de preço (R$ 3.000 a R$ 15.000).
    - Toggle: À Vista com Desconto vs Parcelado sem Juros no Cartão.
    - Card de Impacto no Futuro: Projeta o valor investido a 10 anos.
    - Botão de Ação: *"Ativar Período de Reflexão de 14 Dias"*.
  - [ ] **Simulador 2: Compra ou Troca de Carro (`CarSimulatorCard.tsx`)**:
    - Sliders: Valor do Veículo, Entrada, Meses de Financiamento, Taxa de Juros, Quilometragem Mensal.
    - Painel de Custo Total de Posse (TCO): Exibe a parcela visível e o custo real mensal invisível (depreciação, seguro, IPVA, manutenção).
    - Comparativo visual: Gráfico de barras lado a lado comparando o custo anual do carro novo vs manter o atual e investir.
  - [ ] **Simulador 3: Casa Própria vs Aluguel (`HomeVsRentCard.tsx`)**:
    - 4 Sliders interativos: Valor do Imóvel, Entrada, Taxa de Juros Anual, Aluguel Comparável.
    - Gráfico interativo com 2 curvas de patrimônio líquido cruzando horizontes de 5 a 30 anos (SVG nativo responsivo).
    - Identificação visual clara do ponto de equilíbrio (*Break-even Point*).

- [ ] **Tarefa 2.6: Desenvolver o Painel do "Conselho Consultivo Multi-Escolas"**  
  - [ ] Criar `MultiSchoolCouncilCard.tsx`:
    - Campo para submeter uma dúvida ou plano familiar: *"Queremos fazer uma reforma de R$ 45.000 na cozinha no próximo semestre."*
    - Exibição de 5 pareceres em cards colapsáveis/grid:
      - **Austríaca**: Avalia impacto em ativos reais e reservas duras.
      - **Comportamental**: Verifica se o colchão de tranquilidade continua intacto.
      - **Monetarista**: Alerta sobre o custo de oportunidade real frente à inflação.
      - **Institucionalista**: Orienta sobre contratos de prestação de serviços e notas fiscais com retenção.
      - **Neoclássica**: Apresenta a perda de juros compostos em 10 anos.
    - Nota sintética de viabilidade familiar (de 0 a 10) com recomendação final.

---

## 4. Critérios de Aceitação e Definição de Pronto (DoD)

1. [ ] A rota `/strategy` carrega instantaneamente no navegador com dados atualizados a partir das contas reais cadastradas em `data/accounts/accounts.json`.
2. [ ] Se houver saldo em conta corrente com rendimento zero superior a R$ 5.000, o card de Caixa Ocioso aparece no topo do Radar com a estimativa correta de rendimento mensal do Tesouro Selic.
3. [ ] No simulador de carro, ao alterar a entrada ou a taxa de juros, o custo real mensal (TCO) recalcula em tempo real sem requisição ao servidor.
4. [ ] O simulador de Casa Própria vs Aluguel gera curvas visualmente límpidas que demonstram o impacto da taxa de juros na viabilidade do financiamento imobiliário.
5. [ ] Todos os novos componentes respeitam a paleta do `DESIGN.md` e possuem alvos de toque adequados no mobile.
6. [ ] Nenhuma alteração afeta a execução da suíte de 111 testes existente.

---

## 5. Estratégia de Testes

- **Testes Unitários (`tests/test_strategy_engine.py`)**:
  - Testar detecção de caixa ocioso com diferentes faixas de saldo.
  - Validar a matemática do TCO de automóveis (depreciação FIPE, IPVA e seguro proporcionais).
  - Validar a projeção de 360 meses do simulador imobiliário com taxas de juros nominais e inflação.
  - Testar a lógica de proximidade do teto MEI com valores limites (R$ 80.999 vs R$ 81.001).
- **Testes de API (`tests/test_api_strategy.py`)**:
  - Validar retorno dos endpoints `/api/strategy/*` com mocks e com dados reais de seed.

---

## 6. Riscos e Mitigações

| Risco Identificado | Impacto | Mitigação Arquitetural |
| :--- | :--- | :--- |
| Parâmetros de depreciação e manutenção de carros variarem muito por modelo | Baixo | Uso de faixas conservadoras médias do mercado brasileiro (FIPE) com sliders permitindo ao usuário customizar o percentual. |
| Curvas do simulador imobiliário parecerem excessivamente complexas para o casal | Médio | Interface minimalista destacando apenas a conclusão principal em destaque (*"Alugar e investir acumula R$ 180k a mais em 15 anos"*) com detalhamento em gráfico expansível. |

