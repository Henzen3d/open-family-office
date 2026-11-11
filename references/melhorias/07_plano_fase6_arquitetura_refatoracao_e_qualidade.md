# Plano de Implementação — Fase 6: Refatoração Arquitetural, SQLite ACID & CI/CD
## Robustez Estrutural, Desacoplamento do Monólito e Engenharia de Qualidade

> **Documento de Especificação Técnica e Plano de Trabalho**  
> **Arquivo:** `references/melhorias/07_plano_fase6_arquitetura_refatoracao_e_qualidade.md`  
> **Status:** Pronto para Implementação Posterior  
> **Prioridade:** P1 (Saúde Estrutural do Código e Sustentabilidade)  
> **Estimativa de Esforço:** 3 Semanas

---

## 1. Contexto e Justificativa

Conforme auditado no diagnóstico do sistema (`references/melhorias/00_analise_geral_e_diagnostico_do_sistema.md`), o OpenFamilyOffice possui motores determinísticos de alta qualidade, mas acumulou **débitos técnicos estruturais** decorrentes de um crescimento rápido:

1. **Monólito Extremo no Frontend**: O arquivo `web/app/page.tsx` atingiu **2.664 linhas (153 KB)** com mais de 40 variáveis de estado (`useState`), renderizações em cascata e carregamento adiantado (*eager loading*) de todos os modais. O `SettingsModal.tsx` acumula outras 1.552 linhas.
2. **Monopage sem Rotas Reais**: Toda a navegação opera na rota única `/` através de modais sobrepostos e scrolls imperativos, impedindo URLs diretas (*deep-linking*), favoritos e navegação histórica fluida pelo navegador.
3. **Monólito no Backend**: O arquivo `src/web/api.py` possui **1.696 linhas**, concentrando todos os endpoints de chat, uploads, recibos, mercado, settings e governança em um único módulo.
4. **Armazenamento Não-ACID em Arquivos Planos**: As 1.149 transações reais residem em `data/ledger/transactions.csv` e os cupons em `receipts_db.json`. Não há índices para buscas temporais, nem transações atômicas seguras contra corrupção por queda de energia ou acessos simultâneos.
5. **Ausência de CI/CD e Testes no Frontend**: O repositório não possui workflows do GitHub Actions para validar commits automaticamente, e a camada web não conta com testes automatizados.

A Fase 6 realiza uma **refatoração cirúrgica e segura**, modularizando o frontend e o backend, migrando a persistência para um banco local determinístico em **SQLite com modo WAL (Write-Ahead Logging)** e estabelecendo um pipeline moderno de CI/CD.

---

## 2. Arquitetura Alvo Pós-Refatoração

```
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKEND MODULARIZADO                            │
│  src/web/api.py (REDUZIDO A ~150 LINHAS DE SETUP E MIDDLEWARES)        │
│  src/web/routers/ (NOVO DIRETÓRIO DE ROTAS DESACOPLADAS)               │
│     ├── chat_router.py (Streaming SSE e orquestração SmartRouter)      │
│     ├── statements_router.py (Upload e conciliação OFX/CSV)           │
│     ├── receipts_router.py (OCR, listagem e auditoria de cupons)       │
│     ├── market_router.py (Feeds macroeconômicos e cotações)            │
│     ├── settings_router.py (Provedores, contas bancárias e perfis)    │
│     ├── strategy_router.py (Radar de oportunidades e simuladores)      │
│     └── vault_router.py (Cofre criptografado e sucessão)               │
│                                                                        │
│  src/database/ (NOVA CAMADA DE PERSISTÊNCIA DETERMINÍSTICA)            │
│     ├── db.py (Engine SQLite local com WAL mode e transações ACID)     │
│     ├── schema.sql (Tabelas: accounts, transactions, receipts, etc.)   │
│     ├── migration_from_csv.py (Migração sem perda de dados)           │
│     └── backup_manager.py (Snapshots automáticos com checksum SHA256) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ REST API & SSE
┌───────────────────────────────────▼────────────────────────────────────┐
│                        FRONTEND MODULARIZADO                           │
│  web/app/ (ROTAS REAIS COM NEXT.JS APP ROUTER)                         │
│     ├── layout.tsx (Layout mestre com Sidebar, Header e ToastProvider) │
│     ├── page.tsx (Dashboard Executivo limpo, ~350 linhas)             │
│     ├── ledger/page.tsx (Tela cheia para Extrato e Conciliação)        │
│     ├── receipts/page.tsx (Galeria de Cupons Fiscais e OCR)           │
│     ├── strategy/page.tsx (Central de Estratégias & Simuladores)       │
│     ├── vault/page.tsx (Cofre Legal e Gestão de Sucessão)              │
│     └── settings/page.tsx (Configurações e Provedores)                 │
│                                                                        │
│  web/app/components/dashboard/ (COMPONENTES DO DASHBOARD EXTRAÍDOS)   │
│     ├── BentoLiquidityChart.tsx (Spline SVG de liquidez)               │
│     ├── EntityWalletsCard.tsx (Carteiras segregadas PF/Fix/Facilita)   │
│     ├── MeiCeilingTracker.tsx (Monitor de teto LC 123/2006)            │
│     ├── ConjugalGovernanceCard.tsx (Aprovações a dois)                 │
│     └── QuickPixCard.tsx (Transferências rápidas)                      │
│                                                                        │
│  web/lib/state/ (ESTADO CENTRALIZADO LIGHTWEIGHT)                      │
│     ├── useAccountsStore.ts (Zustand ou React Context tipado)         │
│     └── useChatStore.ts (Gerenciamento da gaveta do assistente)        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Lista Detalhada de Tarefas e Subtarefas

### 3.1 Backend: Decomposição em Routers e Camada SQLite ACID

- [x] **Tarefa 6.1: Modularizar `src/web/api.py` com FastAPI `APIRouter`**  
  - [x] Criar o diretório `src/web/routers/`.
  - [x] Extrair rotas de chat para `src/web/routers/chat_router.py`.
  - [x] Extrair rotas de extratos bancários para `src/web/routers/statements_router.py`.
  - [x] Extrair rotas de cupons fiscais e OCR para `src/web/routers/receipts_router.py`.
  - [x] Extrair rotas macroeconômicas e de mercado para `src/web/routers/market_router.py`.
  - [x] Extrair rotas de provedores e configurações para `src/web/routers/settings_router.py`.
  - [x] Reduzir `src/web/api.py` para menos de 200 linhas, mantendo apenas a inicialização do app FastAPI, configuração de CORS, middlewares de segurança e o include dos routers com prefixos padronizados (`app.include_router(chat_router.router, prefix="/api/chat")`).

- [x] **Tarefa 6.2: Implementar a Camada SQLite Determinística (`src/database/`)**  
  - [x] Criar o diretório `src/database/`.
  - [x] Desenvolver `src/database/schema.sql`:
    - Tabela `accounts`: `id` (PK), `name`, `entity_code`, `holder`, `currency`, `bank_code`, `balance_cents`, `is_active`, `updated_at`.
    - Tabela `transactions`: `id` (PK), `date`, `amount_cents`, `type`, `description`, `category_id`, `account_id`, `receipt_id`, `is_neutralized`, `is_card_reconciled`, `created_at`.
    - Tabela `receipts`: `id` (PK), `entity_code`, `merchant_name`, `merchant_cnpj`, `issue_date`, `total_cents`, `tax_cents`, `sefaz_key`, `image_path`, `ocr_status`, `raw_payload`.
    - Tabela `receipt_items`: `id` (PK), `receipt_id` (FK), `description`, `quantity`, `unit_price_cents`, `total_cents`.
    - Índices otimizados: `idx_transactions_date`, `idx_transactions_account`, `idx_receipts_date`, `idx_transactions_category`.
  - [x] Criar `src/database/db.py`:
    - Conexão SQLite com ativadores de desempenho e segurança:
      - `PRAGMA journal_mode = WAL;` (Write-Ahead Logging para leitura concorrente sem bloqueio).
      - `PRAGMA synchronous = NORMAL;`
      - `PRAGMA foreign_keys = ON;`
    - Context manager para transações atômicas com rollback automático em caso de exceção.

- [x] **Tarefa 6.3: Criar Script de Migração Não-Destrutiva dos Dados Históricos**  
  - [x] Criar `src/database/migration_from_csv.py`:
    - Lê `data/ledger/transactions.csv` (1.149 transações reais).
    - Lê `data/receipts/receipts_db.json`.
    - Lê `data/accounts/accounts.json`.
    - Executa a migração dentro de uma transação SQLite única.
    - Valida soma de controle: O total de créditos, débitos e saldos no SQLite deve bater até o último centavo com os arquivos CSV/JSON originais.
    - Mantém os arquivos originais intactos como backup de segurança com extensão `.bak`.

- [x] **Tarefa 6.4: Implementar o Gerenciador de Backups com Checksum (`backup_manager.py`)**  
  - [x] Criar `src/database/backup_manager.py`:
    - Gera snapshot atômico do banco (`VACUUM INTO 'data/backups/ofo_backup_YYYYMMDD_HHMM.db'`).
    - Calcula hash SHA-256 de verificação para garantir integridade do arquivo.
    - Política de retenção local: mantém os últimos 30 backups diários e os últimos 12 mensais.

---

### 3.2 Frontend: Decomposição do Monólito e Roteamento Next.js

- [x] **Tarefa 6.5: Decompor o Monólito `page.tsx` em Componentes Desacoplados**  
  - [x] Criar o diretório `web/app/components/dashboard/`.
  - [x] Extrair o gráfico de liquidez para `web/app/components/dashboard/BentoLiquidityChart.tsx`.
  - [x] Extrair o card de carteiras das entidades para `web/app/components/dashboard/EntityWalletsCard.tsx`.
  - [x] Extrair o monitor de teto MEI para `web/app/components/dashboard/MeiCeilingTracker.tsx`.
  - [x] Extrair a governança conjugal para `web/app/components/dashboard/ConjugalGovernanceCard.tsx`.
  - [x] Extrair o card de PIX rápido para `web/app/components/dashboard/QuickPixCard.tsx`.
  - [x] Extrair a tabela resumida do livro razão para `web/app/components/dashboard/RecentTransactionsTable.tsx`.
  - [x] Reescrever `web/app/page.tsx` como um orquestrador limpo de menos de 400 linhas que apenas organiza o layout e conecta os componentes.

- [x] **Tarefa 6.6: Criar Rotas Dedicadas no Next.js App Router**  
  - [x] Criar a rota `/ledger` (`web/app/ledger/page.tsx`):
    - Transforma o conteúdo do volumoso `FullStatementModal.tsx` em uma página completa de alta usabilidade, com filtros avançados, barra de busca com debounce, paginação e exportação.
  - [x] Criar a rota `/receipts` (`web/app/receipts/page.tsx`):
    - Galeria visual completa de cupons fiscais, área de drag-and-drop e visualizador com zoom.
  - [x] Criar a rota `/settings` (`web/app/settings/page.tsx`):
    - Transforma as abas do `SettingsModal.tsx` em uma página organizada de configurações do sistema.
  - [x] Manter os modais rápidos disponíveis via atalhos de teclado (⌘K), mas permitindo navegação direta por URL.

- [x] **Tarefa 6.7: Otimização de Performance e Lazy Loading**  
  - [x] Aplicar `next/dynamic` com `ssr: false` para carregar modais e gráficos pesados somente quando requisitados:
    ```tsx
    const ReceiptScannerModal = dynamic(() => import('@/app/components/ReceiptScannerModal'), { ssr: false });
    ```
  - [x] Migrar imagens cruas `<img>` para o componente otimizado `next/image`.
  - [x] Migrar o carregamento de fontes do `<link>` no HTML para `next/font/google` (`Plus_Jakarta_Sans` e `JetBrains_Mono`), eliminando o flash de texto não estilizado (FOUT).

- [x] **Tarefa 6.8: Centralização do Estado no Frontend (Zustand / Custom Hook)**  
  - [x] Criar `web/lib/state/useAccountsStore.ts`:
    - Armazena as contas carregadas, entidade ativa selecionada (`all`, `fix`, `facilita`, `pf`) e saldo consolidado.
    - Evita a propagação manual de props (*prop drilling*) por 6 níveis de componentes.
  - [x] Criar `web/lib/state/useChatStore.ts`:
    - Gerencia o histórico de mensagens da sessão, status de digitação e visibilidade da gaveta.

---

### 3.3 Infraestrutura, PWA e Pipeline de CI/CD

- [x] **Tarefa 6.9: Configurar o Pipeline de CI/CD no GitHub Actions**  
  - [x] Criar o arquivo `.github/workflows/ci.yml`:
    - **Job 1 (Backend Quality)**:
      - Roda em Python 3.12 / 3.14.
      - Executa `ruff check .` e `ruff format --check .`.
      - Executa a suíte de 111 testes com `pytest --cov=src tests/`.
      - Rejeita o build se a cobertura ou os testes falharem.
    - **Job 2 (Frontend Quality)**:
      - Roda em Node.js 20.
      - Executa `npm run lint` (ESLint).
      - Executa `npm run build` (validação estrita de tipos do TypeScript e compilação do Next.js).
    - **Job 3 (Security Audit)**:
      - Roda verificação de vulnerabilidades em dependências (`pip-audit` e `npm audit`).

- [x] **Tarefa 6.10: Transformar o Frontend em PWA com Suporte Offline Básico**  
  - [x] Criar `web/public/manifest.json`:
    - Nome: `OpenFamilyOffice`.
    - Cores do tema: `#0d131f` (dark) e `#5B67F6` (índigo brand).
    - Ícones para tela inicial do smartphone (192x192 e 512x512).
    - Display: `standalone` (sem barra de navegação do browser).
  - [x] Implementar Service Worker básico para permitir abertura rápida e upload de fotos da câmera mesmo com conexão intermitente.

---

## 4. Critérios de Aceitação e Definição de Pronto (DoD)

1. [ ] O arquivo `web/app/page.tsx` possui menos de 450 linhas e não renderiza modais desnecessários no carregamento inicial.
2. [ ] O arquivo `src/web/api.py` possui menos de 200 linhas, operando estritamente como orquestrador dos routers modulares em `src/web/routers/`.
3. [ ] A migração do CSV/JSON para o SQLite é executada com 100% de precisão matemática e zero discrepância de centavos nas 1.149 transações históricas.
4. [ ] O pipeline do GitHub Actions roda com sucesso em cada pull request e no branch principal.
5. [ ] A aplicação atinge pontuação Lighthouse $\ge 90$ em Performance, Acessibilidade e Melhores Práticas.
6. [ ] A suíte de 111 testes do backend é mantida intacta e aprovada.

---

## 5. Estratégia de Testes

- **Testes de Regressão da Migração (`tests/test_database_migration.py`)**:
  - Testar importação do CSV para o SQLite e verificar contagem exata de registros, chaves estrangeiras e integridade referencial.
  - Testar concorrência de escrita no SQLite garantindo que o modo WAL evita erros de `database is locked`.
- **Testes de Integração dos Novos Routers (`tests/test_routers_modular.py`)**:
  - Testar que todos os endpoints mantêm exatamente o mesmo contrato REST e SSE anterior, sem quebrar nenhuma chamada do frontend.
- **Testes de Build no Frontend**:
  - Executar `npm run build` em modo estrito garantindo zero erros de tipagem TypeScript.

---

## 6. Riscos e Mitigações

| Risco Identificado | Impacto | Mitigação Arquitetural |
| :--- | :--- | :--- |
| A alteração da estrutura de arquivos de rotas quebrar o Next.js ou o Docker | Alto | Implementação em branch isolado de refatoração, com testes do build do Dockerfile antes de qualquer merge no main. |
| Corrupção de dados na migração de CSV para SQLite | Crítico | O script de migração roda em modo estritamente somente-leitura nos arquivos CSV de origem, criando o banco de dados como um arquivo novo sem sobrescrever ou apagar os arquivos legados. |

