# Diagnóstico Arquitetural e Análise Geral do Sistema OpenFamilyOffice

> **Documento de Auditoria Técnica e Diagnóstico**  
> **Data:** Novembro de 2026  
> **Sistema:** OpenFamilyOffice v1.0 (Core Determinístico + Dashboard Executivo)  
> **Localização:** `references/melhorias/00_analise_geral_e_diagnostico_do_sistema.md`  

---

## 1. Sumário Executivo do Diagnóstico

O **OpenFamilyOffice** consolidou com sucesso um dos requisitos mais difíceis da tecnologia financeira privada: **um núcleo de dados determinístico, auditável e local-first com total segregação entre Pessoa Física (PF) e Pessoa Jurídica (2 MEIs: Fix Serviços e Facilita Vistorias)**.

Diferente de aplicativos comerciais comuns de orçamento (YNAB, Mobills, Organizze) que se apoiam em estimativas ou conexões bancárias frágeis, o OpenFamilyOffice já possui:
1. **Neutralizador de Transferências Internas**: Eliminação matemática de receita/despesa duplicada entre contas próprias (PJ $\leftrightarrow$ PF).
2. **Reconciliador de Faturas de Cartão**: Registro na data do fato gerador com compensação na liquidação da fatura.
3. **Ingestão Fiscal com OCR Duplo**: Decodificador exato de chave QR-Code NFC-e (SEFAZ) com fallback via Tesseract/Indra OCR e higienização EXIF de fotos.
4. **Governança Anti-Vazamento (PII Sanitizer & Egress Guard)**: Algoritmo Módulo-11 para CPF/CNPJ, máscara de 4 tipos de chave PIX e blindagem estrita antes do envio para qualquer LLM externa.
5. **Roteamento Inteligente com Resiliência Gratuita (SmartRouter)**: Classificação de intenção sub-milissegundo, medição de taxa por janela deslizante (RPM/TPM/RPD) e transição transparente de provedores (Gemini $\rightarrow$ Groq $\rightarrow$ OpenRouter $\rightarrow$ NVIDIA NIM).
6. **Suíte de Testes Automatizados**: 111 testes de unidade e integração no backend com 100% de aprovação.

Entretanto, uma auditoria profunda do código-fonte revelou **gargalos arquiteturais, limitações de persistência e oportunidades cruciais de inovação** que impedem o sistema de atingir seu potencial pleno de "Gabinete de Inteligência Familiar Multigeracional", conforme preconizado no documento de pesquisa de mercado (`references/melhorias/pesquisa-melhorias.md`).

---

## 2. Auditoria Detalhada por Camada do Sistema

### 2.1 Backend (`src/`)

```
src/
├── controller/        # Lógica de negócio e orquestração de dados
├── engine/            # Motores de cálculo (briefing, fluxo de caixa, runway, teto MEI)
├── intelligence/      # Feeds macroeconômicos (BCB, notícias RSS, ferramentas de assistente)
├── integrations/      # Clientes públicos (AwesomeAPI, BrasilAPI, Feriados, Crypto)
├── llm/               # Universal Client, SmartRouter, Fallback, Rate Limiter
├── models/            # Dataclasses e Pydantic models
├── security/          # Sanitizador PII e Egress Guard
└── web/api.py         # Aplicação FastAPI monolítica (1.696 linhas)
```

#### Pontos Fortes:
- **Separação de Entidades**: Separação conceitual impecável entre `HOUSEHOLD_OSMAR`, `FIX_SERVICOS` e `FACILITA_VISTORIAS`.
- **Precisão Numérica**: Uso consistente de `Decimal` e inteiros centesimais para cálculo financeiro, eliminando erros de ponto flutuante.
- **Proteção LGPD/PII**: O `PIISanitizer` em `src/security/sanitizer.py` valida CPFs/CNPJs reais com Módulo-11 e substitui por tokens reversíveis, impedindo que dados do casal sejam vazados para APIs de IA.
- **Roteamento de IA**: Excelente arquitetura de resiliência em `src/llm/` com limite de 80% do RPM antes de chavear de provedor.

#### Vulnerabilidades e Dívidas Técnicas:
1. **Monólito em `src/web/api.py` (1.696 linhas)**:
   - O arquivo acumula rotas de chat, upload de OFX, SSE, reconciliação de recibos, cotações de mercado, persistência de configurações e auditoria de recibos.
   - Falta modularização em `APIRouter` por domínio (`routers/chat.py`, `routers/statements.py`, `routers/receipts.py`, `routers/market.py`).
2. **Armazenamento Não-ACID Baseado em Arquivos Planos (CSV e JSON)**:
   - As transações residem em `data/ledger/transactions.csv` e recibos em `data/receipts/receipts_db.json`.
   - Inexistência de índices para consultas temporais ou por categoria: cada consulta lê e decodifica o arquivo inteiro.
   - Risco de corrupção ou *race condition* em caso de acessos simultâneos (ex: importação de extrato enquanto a IA reconcilia um cupom).
3. **Ausência de Cálculos de Rentabilidade Real**:
   - `src/intelligence/market_feed.py` e `bcb_client.py` buscam Selic e IPCA, mas não há um motor que desconte a inflação acumulada para apresentar o retorno real líquido dos saldos e investimentos.
4. **Acoplamento Regional Exclusivo ao Brasil**:
   - Todo o sistema de impostos e contas foi desenhado em torno do MEI/Simples Nacional e BRL. Não há abstração para instrumentos patrimoniais americanos (USD, 401k, Roth IRA, HYSA, W-8BEN, Schedule D).
5. **Falta de Persistência de Sessões de Chat e Memória Estratégica**:
   - As conversas do assistente residem na memória do cliente web; reiniciar o navegador apaga o histórico e as decisões acordadas.

---

### 2.2 Frontend (`web/`)

```
web/app/
├── layout.tsx                  (1.034 B)   Layout base com import de fontes
├── page.tsx                    (153 KB / 2.664 linhas) ← MONÓLITO PRINCIPAL
├── not-found.tsx               (983 B)     Página 404
├── globals.css                 (3.575 B)   Tokens visuais e animações Impeccable
└── components/
    ├── SettingsModal.tsx       (79 KB / 1.552 linhas)
    ├── FullStatementModal.tsx  (33 KB / 752 linhas)
    ├── AssetDetailModal.tsx    (18 KB / 434 linhas)
    ├── StatementModal.tsx      (18 KB / 392 linhas)
    ├── ReceiptViewerModal.tsx  (17 KB / 414 linhas)
    ├── ReceiptScannerModal.tsx (17 KB / 382 linhas)
    ├── ExecutiveModals.tsx     (14 KB / 269 linhas)
    └── MarketTicker.tsx        (11 KB / 192 linhas)
```

#### Pontos Fortes:
- **Qualidade Visual de Nível Executivo**: Tema escuro sofisticado com paleta stone/indigo/amber, tipografia monospace (`JetBrains Mono`) para dados numéricos e espaçamento equilibrado.
- **Gráficos SVG Nativos sem Dependências Pesadas**: Splines suaves calculados via interpolação de Catmull-Rom em SVG nativo, com gradientes e tooltips rápidos.
- **Responsividade Móvel**: Barra de navegação inferior dedicada no mobile, gaveta de chat em tela cheia e captura de câmera fotográfica com alvo de toque $\ge 44$px.
- **Modo ASD-STE100 no Chat**: Toggle visual para controlar a concisão e objetividade das respostas da IA.

#### Vulnerabilidades e Dívidas Técnicas:
1. **Monólito Extremo em `web/app/page.tsx` (2.664 linhas / 153 KB)**:
   - Todo o dashboard, sidebar, grids bento, gráficos, tabelas e gaveta de chat estão em um único arquivo de componente React.
   - Mais de 40 variáveis de estado (`useState`) declaradas no componente raiz provocam renderizações em cascata a cada interação simples.
2. **Ausência de Roteamento Real (Single-Route Monopage)**:
   - A aplicação inteira roda na rota `/`. Não há `/settings`, `/statements`, `/receipts` ou `/strategy`. Tudo depende de modais sobrepostos e scrolls imperativos via `document.getElementById()`.
   - É impossível salvar favoritos (*bookmarks*), compartilhar links internos ou usar o botão "Voltar" do navegador de forma natural.
3. **Respostas do Chat Estritamente Textuais (Sem Generative UI)**:
   - Quando o assistente responde sobre juros, metas ou planejamento, ele cospe texto Markdown ou tabelas estáticas.
   - O usuário não tem controles deslizantes (*sliders*), cartões dinâmicos ou elementos com os quais possa interagir na hora, conforme proposto pela filosofia de Andrej Karpathy.
4. **Falta de Gerenciamento de Estado Global (SWR / React Query / Zustand)**:
   - Cada chamada de API usa `fetch()` bruto dentro de `useEffect()`. Não há cache de requisições, invalidação automática, revalidação em segundo plano nem atualizações otimistas.
5. **Zero Testes no Frontend**:
   - Não há configuração de Vitest, Jest, React Testing Library, Cypress ou Playwright para garantir que alterações visuais ou funcionais não quebrem o dashboard.

---

### 2.3 Camada de Dados, Segurança e Infraestrutura

#### Armazenamento Atual:
- `data/ledger/transactions.csv` (~1.149 transações reais).
- `data/accounts/accounts.json` (contas bancárias e saldos).
- `data/receipts/receipts_db.json` (recibos e cupons escaneados).
- `data/macro_cache/` (cache de cotações em JSON).

#### Riscos Identificados:
- **Ausência de Transações Atômicas (ACID)**: Uma falha de energia ou interrupção durante a gravação de um recibo pode deixar o arquivo JSON corrompido.
- **Criptografia em Repouso Limitada**: Arquivos de transações e contas bancárias residem em texto plano no disco local. Para um sistema de tesouraria privada e cofre de documentos familiares, é mandatório suporte a criptografia local (AES-256-GCM).
- **Sem Pipeline de CI/CD**: O repositório possui templates de issues, mas não tem `.github/workflows/` para rodar testes, linting (`ruff`, `eslint`) ou checagem de tipos no TypeScript e Python a cada commit.

---

## 3. Matriz Comparativa: Estado Atual vs. Visão do `pesquisa-melhorias.md`

| Dimensão / Funcionalidade | Estado Atual do Sistema | Visão Proposta no Plano Diretor (`pesquisa-melhorias.md`) | Gap Identificado |
| :--- | :--- | :--- | :--- |
| **Interface com IA** | Chat de texto puro com Markdown estático + cards de confirmação pontual. | **Generative UI (Andrej Karpathy)**: Respostas como páginas/cards interativos com sliders vivos. | Alta prioridade; o chat atual é passivo e textual. |
| **Estratégia & Decisões** | Indicadores dispersos (teto MEI, runway em meses). | **Strategy Hub Dedicado**: Radar proativo de oportunidades + simuladores de grandes compras (carro, casa, celular). | Falta uma tela de inteligência deliberativa para a família. |
| **Escolas Econômicas** | Regras isoladas de MEI e neutralização contábil. | **5 Escolas Integradas**: Austríaca (Hard Assets), Comportamental (Colchão 2-5a), Monetarista (Ganho Real), Institucionalista (Cofre Legal) e Neoclássica (Juros Compostos). | Inexistência de métricas e travas baseadas em teoria econômica sólida. |
| **Escopo Geográfico / Moeda** | 100% Brasil / BRL / Selic / MEI. | **Cross-Border Flexível**: Módulo Brasil (BRL) + Módulo Expatriado (BRL/USD com PTAX) + Módulo US (USD, 401k, Roth IRA, HSA, IRS 1040). | O sistema não suporta contas em dólar, remessas ou patrimônio no exterior. |
| **Guarda de Documentos** | Fotos de cupons fiscais em JPEG com OCR. | **Cofre Legal & Documental (Legal Vault)**: Repositório criptografado para escrituras, contratos sociais, apólices e diretivas de sucessão. | Totalmente ausente; documentos vitais não possuem área protegida. |
| **Cálculo Inflacionário** | IPCA capturado via BCB apenas para exibição em ticker. | **Filtro Mandatório de Rentabilidade Real**: Proibição de ganho puramente nominal sem desconto do IPCA/CPI. | Ativos e saldos mostram apenas valores nominais. |
| **Arquitetura Frontend** | Monólito de 2.664 linhas em `page.tsx` com 40+ `useState`. | Componentes desacoplados, rotas Next.js dedicadas (`/`, `/strategy`, `/vault`), estado centralizado e testes. | Alto débito técnico de manutenibilidade e performance. |
| **Persistência de Dados** | Arquivos soltos CSV e JSON. | Banco de dados local determinístico (SQLite em modo WAL com integridade referencial) + backups criptografados. | Vulnerabilidade a corrupção e lentidão em escala. |

---

## 4. Conclusão do Diagnóstico e Princípios para os Planos

O OpenFamilyOffice possui uma fundação técnica invejável: lógica contábil limpa, respeito obsessivo à privacidade do usuário e integração robusta com APIs públicas. 

Os planos de implementação a seguir foram organizados de forma **modular, cirúrgica e progressiva**, permitindo que a equipe implemente melhorias sem desestabilizar as 111 suítes de testes existentes e sem quebrar as rotinas diárias da família.

O plano mestre e os planos detalhados de cada fase encontram-se nos documentos subsequentes desta pasta:
- `01_plano_mestre_roadmap_estrategico.md`
- `02_plano_fase1_generative_ui_e_calculadoras.md`
- `03_plano_fase2_strategy_hub_e_simuladores.md`
- `04_plano_fase3_escolas_economicas_e_indicadores.md`
- `05_plano_fase4_cross_border_br_us_e_multimoeda.md`
- `06_plano_fase5_legal_vault_e_seguranca.md`
- `07_plano_fase6_arquitetura_refatoracao_e_qualidade.md`

