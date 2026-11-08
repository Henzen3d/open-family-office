# OpenFamilyOffice • Backlog de Tarefas & Arquitetura de Fases Futuras

**Padrão Documental:** ASD-STE100 (~80%)  
**Objetivo:** Roadmap de engenharia para implementação das funcionalidades subsequentes.  
**Governança:** Separação estrita dos CNPJs (Fix Serviços • Osmar e Facilita Vistorias • Vera) e núcleo familiar PF (Nubank Ultravioleta).

---

## 1. Fase 4: Ingestão de Extratos Bancários OFX / CSV (Nubank, Inter, Caixa)

### 1.1 Objetivos Técnicos
- Processar extratos OFX (`.ofx`), QFX (`.qfx`) e CSV exportados manualmente ou recebidos via automação.
- Garantir idempotência total através de hash SHA-256 único por transação.
- Neutralizar transferências internas entre contas PJ e PF, prevenindo dupla contagem patrimonial.

### 1.2 Backlog de Tarefas (Sprint OFX)
- [ ] **OFX-01: Parser Determinístico de Arquivos OFX/QFX**
  - Módulo: `src/controller/ofx_parser.py`
  - Leitura das tags OFX `BANKTRANLIST`, `STMTTRN`, `TRNTYPE`, `DTPOSTED`, `TRNAMT`, `FITID`, `MEMO`.
  - Tratamento de divergências de formatação entre Caixa Econômica, Banco Inter e Nubank.
- [ ] **OFX-02: Deduplicador Idempotente por Hash SHA-256**
  - Algoritmo: `sha256(entity_id + fitid + date + amount)`
  - Evita duplicações caso o usuário importe extratos com datas sobrepostas.
- [ ] **OFX-03: Neutralizador de Transferências Inter-Entidades**
  - Módulo: `src/accounting/transfer_neutralizer.py`
  - Identifica paridade de valor e data entre débito Inter PJ / Caixa PJ e crédito Nubank PF.
  - Classificação automática: *Distribuição de Lucros Isenta* ou *Pró-labore MEI*.
- [ ] **OFX-04: Endpoint e Interface de Upload de Extrato**
  - Endpoint: `POST /api/statements/upload` (multipart/form-data)
  - UI: Dropzone no dashboard com preview das transações extraídas antes da confirmação.

---

## 2. Fase 5: Feed de Inteligência de Mercado & APIs Financeiras Públicas

### 2.1 Fontes Públicas Homologadas (`github.com/public-apis/public-apis`)
- **Moedas & Câmbio:**
  - *AwesomeAPI Moedas:* `https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL` (Gratuita, sem chave, alta disponibilidade).
  - *Banco Central do Brasil (SGS/Olinda):* PTAX oficial diária de fechamento.
- **Índices Macroeconômicos Brasileiros:**
  - *BACEN Séries Temporais:* Série 432 (Taxa Selic Meta anualizada), Série 433 (IPCA mensal acumulado).
- **Criptoativos:**
  - *CoinGecko API v3 (Public):* `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=brl,usd`
- **Renda Variável & FIIs:**
  - *Brapi API / Yahoo Finance API:* Cotações de ações da B3, dividend yields e fundos imobiliários com cache de 15 minutos.

### 2.2 Backlog de Tarefas (Sprint Market Intelligence)
- [ ] **MKT-01: Adaptador de Câmbio e PTAX em Tempo Real**
  - Módulo: `src/integrations/currency_client.py`
  - Atualização automática de USD-BRL e EUR-BRL para consolidação de ativos em moeda forte.
- [ ] **MKT-02: Monitor de Indicadores Macroeconômicos (Selic & IPCA)**
  - Módulo: `src/integrations/macro_client.py`
  - Cálculo de rendimento da reserva de emergência (100% CDI) versus inflação real acumulada.
- [ ] **MKT-03: Cripto & Renda Variável Tracker**
  - Módulo: `src/integrations/crypto_client.py`
  - Cotação periódica de Bitcoin e Ethereum com conversão automática em BRL.
- [ ] **MKT-04: Cache em Disco com TTL (15 minutos)**
  - Módulo: `src/cache/ttl_cache.py`
  - Gravação dos dados em `/data/macro_cache/market_latest.json`.
  - Resiliência offline caso o servidor perca conexão temporariamente com a internet.

---

## 3. Fase 6: Pipeline Multimodal de Extração de Recibos e Cupons Fiscais (OCR Vision)

### 3.1 Arquitetura de Processamento Seguro
1. Upload de foto capturada em celular via app Next.js (`POST /api/receipts/upload`).
2. Análise pelo módulo `src/ocr/vision_processor.py` utilizando o provedor LLM configurado em primeiro lugar com suporte multimodal (`gemini-2.0-flash`, `gpt-4o-mini` ou `claude-3-5-sonnet`).
3. Extração estruturada em JSON Schema rígido:
   - `cnpj_emissor`: string mascarada
   - `razao_social`: string
   - `data_emissao`: ISO-8601
   - `valor_total`: decimal positivo
   - `forma_pagamento`: string (`PIX`, `Cartão Débito`, `Cartão Crédito`, `Boleto`)
   - `categoria_sugerida`: string
4. Conferência visual na tela do Assistente antes da efetivação no livro-razão local.

### 3.2 Backlog de Tarefas (Sprint OCR Vision)
- [ ] **OCR-01: Extrator Vision com JSON Schema Restrito**
  - Prompt especializado seguindo diretrizes ASD-STE100.
  - Extração de itens e separação entre despesas dedutíveis MEI e consumo familiar PF.
- [ ] **OCR-02: Sanitização Prévia de Metadados de Imagem (EXIF Purge)**
  - Remoção de coordenadas GPS e metadados de câmera antes do envio ao provedor de IA.
- [ ] **OCR-03: Reconciliador Automático Recibo x Lançamento Bancário**
  - Módulo: `src/ocr/matcher.py`
  - Cruzamento de data ($\pm 2$ dias) e valor exato com extrato do Inter PJ ou Caixa PJ.
- [ ] **OCR-04: Interface de Validação e Ajuste de Lançamento**
  - Modal com visualização da foto do cupom e campos editáveis pelo usuário.

