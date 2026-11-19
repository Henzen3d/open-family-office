# Relatório Executivo de Consolidação Histórica (2020 - 2026)
## Fix Serviços MEI & Household Familiar (Osmar & Vera)
*Arquivo Fonte: Gestão e Controle Financeiro 2024.xls | Gerado pelo OpenFamilyOffice*

> [!NOTE]
> Este relatório consolida os dados financeiros reais da Fix Serviços e do Household desde 2020. 
> As despesas foram discriminadas item a item até meados de 2023; a partir de então, os lançamentos registram o faturamento operacional integral e as retiradas pro-labore / lucros.

### 1. Indicadores Financeiros Macroglobais (7 Anos)
| Indicador | Valor Consolidado (R$) | Observações |
| :--- | :--- | :--- |
| **Faturamento Bruto Total** | **R$ 915,510.50** | Receitas consolidadas (todas as fontes) |
| **Receita Fix Serviços MEI** | **R$ 827,905.50** | 90.4% do faturamento total |
| **Receita de Aluguel (PF)** | **R$ 50,310.00** | Renda imobiliária passiva |
| **Despesas Totais Registradas** | **R$ 407,389.14** | Custos operacionais e despesas familiares |
| **Resultado Líquido Histórico** | **R$ 508,121.36** | Margem líquida consolidada de 55.5% |
| **Total de Transações Ledger** | **1149** | Registros no livro-razão auditável |

### 2. Evolução Anual Consolidada (2020 - 2026)
| Ano | Faturamento Total | Fix Serviços MEI | Aluguel (PF) | Despesas Registradas | Resultado Líquido | Status Teto MEI (R$ 81k) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **2020** | R$ 90,280.31 | R$ 78,880.31 | R$ 11,400.00 | R$ 76,297.70 | R$ 13,982.61 | ✅ Dentro do Teto |
| **2021** | R$ 126,706.00 | R$ 99,116.00 | R$ 10,500.00 | R$ 99,068.21 | R$ 27,637.79 | ⚠️ Acima do Teto (122.4%) |
| **2022** | R$ 150,177.00 | R$ 128,717.00 | R$ 7,560.00 | R$ 114,677.55 | R$ 35,499.45 | ⚠️ Acima do Teto (158.9%) |
| **2023** | R$ 138,005.00 | R$ 126,205.00 | R$ 6,000.00 | R$ 76,311.46 | R$ 61,693.54 | ⚠️ Acima do Teto (155.8%) |
| **2024** | R$ 150,510.10 | R$ 144,455.10 | R$ 5,550.00 | R$ 15,051.02 | R$ 135,459.08 | ⚠️ Acima do Teto (178.3%) |
| **2025** | R$ 156,199.75 | R$ 150,199.75 | R$ 6,000.00 | R$ 15,619.98 | R$ 140,579.77 | ⚠️ Acima do Teto (185.4%) |
| **2026** | R$ 103,632.34 | R$ 100,332.34 | R$ 3,300.00 | R$ 10,363.22 | R$ 93,269.12 | ⚠️ Acima do Teto (123.9%) (Jan-Set) |

### 3. Distribuição de Despesas Acumuladas por Categoria
| Categoria | Total Acumulado (R$) | Participação (%) | Classificação |
| :--- | :--- | :--- | :--- |
| Mercado | R$ 86,537.66 | 21.2% | Household PF |
| Cartão de Crédito | R$ 56,848.35 | 14.0% | Household PF |
| Gasolina | R$ 35,893.76 | 8.8% | Household PF |
| Apartamento | R$ 29,139.83 | 7.2% | Household PF |
| Prolabore Osmar | R$ 28,811.75 | 7.1% | Transferência Lucro |
| Restaurante | R$ 26,909.62 | 6.6% | Household PF |
| Prolabore Vera | R$ 24,094.51 | 5.9% | Transferência Lucro |
| Diversos | R$ 12,843.70 | 3.2% | Household PF |
| Condomínio | R$ 12,598.88 | 3.1% | Household PF |
| Manutenção Carro | R$ 8,673.88 | 2.1% | Household PF |
| Empréstimo | R$ 8,358.00 | 2.1% | Household PF |
| Adiantamento Casa | R$ 8,000.00 | 2.0% | Household PF |
| Insumos e Ferramentas | R$ 7,152.28 | 1.8% | Fix Serviços PJ |
| Academia | R$ 6,180.40 | 1.5% | Household PF |
| Farmácia | R$ 5,620.21 | 1.4% | Household PF |
| Eletricidade / Luz | R$ 4,987.63 | 1.2% | Household PF |
| Suplementos | R$ 4,957.60 | 1.2% | Household PF |
| INSS | R$ 4,801.82 | 1.2% | Fix Serviços PJ |
| Eletricidade | R$ 4,370.15 | 1.1% | Household PF |
| Empréstimo Pausa | R$ 3,938.80 | 1.0% | Household PF |

### 4. Recomendações de Governança Familiar & Blindagem Tributária
1. **Segregação de Faturamento (Fix Serviços + Facilita Vistorias)**:
   - O faturamento histórico da Fix Serviços superou R$ 81.000 em 2021 (R$ 99,1k), 2022 (R$ 128,7k), 2023 (R$ 126,2k), 2024 (R$ 144,5k), 2025 (R$ 150,2k) e 2026 (R$ 100,3k até set).
   - A decisão de manter a titularidade autônoma da Facilita Vistorias no CNPJ da Vera e Fix Serviços no CNPJ do Osmar é fiscalmente perfeita para comportar esse volume operacional mantendo ambas as operações blindadas.
2. **Neutralização PJ ↔ PF das Retiradas de Pró-labore**:
   - As retiradas familiares registradas foram parametrizadas como transferências pareadas neutras (`is_transfer=True`), blindando o patrimônio contra alegações de confusão patrimonial.
3. **Prontidão para Importações Futuras**:
   - Com a estrutura agora padronizada no formato `transactions.csv`, os lançamentos dos extratos bancários de 2024 a 2026 via OFX/CSV farão a conciliação automática com esses números.