# Plano de Implementação — Fase 5: Cofre Legal & Gestão de Sucessão Patrimonial
## Segurança Institucional: Protegendo o Patrimônio contra Litígios, Perdas e Sucessão Traumática

> **Documento de Especificação Técnica e Plano de Trabalho**  
> **Arquivo:** `references/melhorias/06_plano_fase5_legal_vault_e_seguranca.md`  
> **Status:** Pronto para Implementação Posterior  
> **Prioridade:** P1 (Proteção de Longo Prazo e Governança Familiar)  
> **Estimativa de Esforço:** 2 Semanas

---

## 1. Contexto e Justificativa

Conforme sustentado na Escola Institucionalista (Douglass North, Nobel de Economia) no documento diretor (`references/melhorias/pesquisa-melhorias.md`, Seção 4.4):
> *"Mercados e poupança só florescem sob instituições sólidas, respeito a contratos e direitos de propriedade inequívocos. A falta de documentação formal e estrutura jurídica expõe o patrimônio a confiscos, litígios familiares, bloqueios judiciais e perdas brutais no inventário."*

A vasta maioria das famílias guarda documentos vitais espalhados: escrituras de imóveis em gavetas, certidões de casamento com pacto antenupcial desatualizadas, apólices de seguro com beneficiários incorretos e nenhuma instrução clara para os herdeiros em caso de emergência ou falecimento.

A Fase 5 implementa duas ferramentas de alto impacto para a família:
1. **Cofre Legal & Documental (Legal Vault)**: Repositório local com criptografia militar **AES-256-GCM**, onde o casal pode armazenar e catalogar escrituras, contratos sociais dos MEIs, apólices de seguro, comprovantes de quitação e diretivas legais com total privacidade local-first.
2. **Protocolo de Sucessão e Herança (Estate Planning & Succession)**: Um checklist institucional com medidor de prontidão sucessória (*Succession Readiness Score*), mapeando beneficiários de contas/previdência e orientando a transmissão suave do patrimônio para as próximas gerações.

---

## 2. Arquitetura Técnica e Arquivos Envolvidos

```
┌────────────────────────────────────────────────────────────────────────┐
│                              BACKEND                                   │
│  src/security/legal_vault.py (NOVO)                                    │
│     ├── VaultEncryptionEngine (AES-256-GCM + PBKDF2/Argon2id)          │
│     ├── DocumentMetadataStore (Catalogação e datas de expiração)       │
│     └── SuccessionChecklistManager (Auditoria de prontidão)            │
│                                                                        │
│  data/vault/ (NOVO DIRETÓRIO DE DADOS CRIPTOGRAFADOS)                  │
│     ├── documents/ (*.enc - Arquivos protegidos no disco)              │
│     └── vault_catalog.json (Metadados anonimizados)                    │
│                                                                        │
│  src/web/api.py (MODIFICAR)                                            │
│     ├── POST /api/vault/unlock (Desbloqueio com senha-mestre)         │
│     ├── GET  /api/vault/documents (Listagem com metadados)             │
│     ├── POST /api/vault/upload (Upload e criptografia local)           │
│     ├── GET  /api/vault/document/{id}/download (Download descriptado)  │
│     └── GET  /api/vault/succession-status (Checklist sucessório)       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ JSON API + File Streams
┌───────────────────────────────────▼────────────────────────────────────┐
│                              FRONTEND                                  │
│  web/app/components/legal_vault/ (NOVO DIRETÓRIO)                      │
│     ├── LegalVaultModal.tsx (Interface principal do cofre protegido)   │
│     ├── VaultUnlockPrompt.tsx (Modal de senha-mestre com auto-lock)    │
│     ├── DocumentUploader.tsx (Upload drag-and-drop com tags)           │
│     ├── SuccessionChecklistCard.tsx (Medidor de prontidão sucessória)  │
│     └── EmergencyAccessGuide.tsx (Guia "Em Caso de Emergência")        │
│                                                                        │
│  web/app/components/Sidebar.tsx (MODIFICAR)                            │
│     └── Botão do Cofre Legal com indicador de status (trancado/aberto) │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Lista Detalhada de Tarefas e Subtarefas

### 3.1 Backend: Motor Criptográfico e Gestão Documental

- [ ] **Tarefa 5.1: Implementar o Motor Criptográfico do Cofre (`src/security/legal_vault.py`)**  
  - [ ] Implementar a classe `VaultEncryptionEngine`:
    - Algoritmo de derivação de chave: `PBKDF2HMAC` com SHA-256 e $600.000$ iterações (ou `Argon2id` se disponível).
    - Criptografia simétrica autenticada: `AES-256-GCM` com nonce de 96 bits aleatório por arquivo e tag de autenticação de 128 bits para detecção de adulteração física.
    - Gerenciamento de chave em memória: chave mestre mantida temporariamente na memória RAM da sessão do backend com expiração automática após 15 minutos de inatividade (*session auto-lock*).
    - Proibição absoluta de persistir a senha ou a chave descriptografada em disco ou logs.
  - [ ] Implementar a classe `DocumentMetadataStore`:
    - Categorias padronizadas de documentos:
      1. `REAL_ESTATE`: Escrituras públicas, matrículas de cartório, certidões negativas de ônus, carnês de IPTU.
      2. `CORPORATE_MEI`: Contratos sociais, CCMEI, alterações contratuais, alvarás, certificados digitais (.pfx protegidos).
      3. `PERSONAL_FAMILY`: Certidão de casamento, pacto antenupcial, documentos de identidade, procurações públicas.
      4. `INSURANCE_HEALTH`: Apólices de seguro de vida, termos de quitação de financiamentos, planos funerários/saúde.
      5. `SUCCESSION_WILL`: Minutas de testamento, termos de indicação de beneficiários (VGBL/PGBL/401k), diretivas de vontade.
    - Metadados armazenados: `id`, `filename_orig`, `category`, `description`, `issued_date`, `expiration_date`, `registry_office` (cartório), `tags`, `file_size_bytes`, `sha256_hash`.

- [ ] **Tarefa 5.2: Implementar o Gerenciador de Sucessão Patrimonial**  
  - [ ] Implementar a classe `SuccessionChecklistManager`:
    - Checklist estruturado composto por 8 requisitos institucionais:
      1. [ ] Certidão de casamento e pacto antenupcial catalogados e vigentes.
      2. [ ] Todas as propriedades imobiliárias possuem matrícula definitiva registrada em nome do casal (sem contratos de gaveta pendentes).
      3. [ ] Contas bancárias e corretoras possuem titularidade clara ou autorização de movimentação conjugal formalizada.
      4. [ ] Planos de previdência privada (VGBL/PGBL/401k) possuem beneficiários explícitos cadastrados sem depender de inventário.
      5. [ ] Apólices de seguro de vida com beneficiários atualizados e apólices salvas no cofre.
      6. [ ] Contrato social dos MEIs prevê cláusula de continuidade ou liquidação rápida sem bloquear a família.
      7. [ ] Diretivas antecipadas de vontade e procuração médica outorgada ao cônjuge em caso de incapacidade súbita.
      8. [ ] Guia de Instruções de Emergência preenchido com orientações de acesso ao cofre.
    - Cálculo do **Índice de Prontidão Sucessória (Succession Readiness Score)**: percentual de 0% a 100% dos requisitos cumpridos.

- [ ] **Tarefa 5.3: Criar os Endpoints REST do Cofre em `src/web/api.py`**  
  - [ ] `POST /api/vault/status`: Retorna se o cofre está inicializado e se está trancado (*locked/unlocked*).
  - [ ] `POST /api/vault/initialize`: Define a senha-mestre inicial da família gerando o salt criptográfico.
  - [ ] `POST /api/vault/unlock`: Valida a senha-mestre e abre a sessão temporária na memória RAM.
  - [ ] `POST /api/vault/lock`: Limpa a chave da memória e tranca o cofre imediatamente.
  - [ ] `GET /api/vault/documents`: Retorna a lista de documentos com metadados e status de validade.
  - [ ] `POST /api/vault/upload`: Recebe arquivo via `UploadFile`, gera o hash SHA-256, criptografa em AES-256-GCM e grava o arquivo protegido em `data/vault/documents/`.
  - [ ] `GET /api/vault/document/{doc_id}/download`: Descriptografa sob demanda e transmite como `FileResponse` temporário em memória.
  - [ ] `GET /api/vault/succession`: Retorna os itens do checklist sucessório e o score de prontidão.

---

### 3.2 Frontend: Interface Segura do Cofre Legal

- [ ] **Tarefa 5.4: Desenvolver o Prompt de Senha e Desbloqueio (`VaultUnlockPrompt.tsx`)**  
  - [ ] Criar `web/app/components/legal_vault/VaultUnlockPrompt.tsx`:
    - Modal de alta segurança com efeito de desfoque de fundo profundo (`backdrop-blur-md`).
    - Campo de senha-mestre com feedback de força da senha.
    - Temporizador visual de inatividade (ex: aviso de auto-lock após 15 minutos sem uso).
    - Botão de bloqueio de pânico imediato (*Panic Lock*).

- [ ] **Tarefa 5.5: Desenvolver o Modal Principal do Cofre (`LegalVaultModal.tsx`)**  
  - [ ] Criar `web/app/components/legal_vault/LegalVaultModal.tsx`:
    - Cabeçalho com ícone de cofre/escudo e indicador visual: 🔒 *Cofre Protegido com AES-256-GCM*.
    - Seletor de categorias por pills horizontais (Todos, Imóveis, MEI/Empresas, Pessoal, Seguros, Sucessão).
    - Grid de cartões de documentos com:
      - Ícone do tipo de arquivo (PDF, Imagem, Certificado).
      - Nome do documento e descrição.
      - Cartório / Órgão emissor.
      - Badge de validade (Verde: Válido • Amarelo: Expira em 30 dias • Vermelho: Expirado).
      - Botão de download seguro e botão de exclusão.
    - Botão em destaque: `[ + Adicionar Documento Criptografado ]`.

- [ ] **Tarefa 5.6: Desenvolver o Componente de Upload Seguro (`DocumentUploader.tsx`)**  
  - [ ] Criar `web/app/components/legal_vault/DocumentUploader.tsx`:
    - Zona de drag-and-drop para arquivos (PDFs, imagens digitalizadas, scans de cartório).
    - Formulário rápido de metadados: Categoria, Nome identificador, Órgão/Cartório, Data de Emissão, Data de Vencimento e Notas confidenciais.
    - Barra de progresso da criptografia local antes do salvamento.

- [ ] **Tarefa 5.7: Desenvolver o Card de Prontidão Sucessória (`SuccessionChecklistCard.tsx`)**  
  - [ ] Criar `web/app/components/legal_vault/SuccessionChecklistCard.tsx`:
    - Barra de progresso visual com o Score de Prontidão (ex: 62% • *"Em Estruturação"*).
    - Lista interativa com os 8 requisitos institucionais:
      - Cada item exibe status (Cumprido / Pendente) e botão para anexar o documento probatório correspondente no cofre.
    - Alerta institucional: *"Em caso de ausência súbita de um dos cônjuges, 3 documentos críticos estão ausentes, o que pode gerar bloqueio de contas ou inventário oneroso."*

- [ ] **Tarefa 5.8: Integrar o Botão do Cofre Legal na Interface Principal**  
  - [ ] Adicionar o botão do Cofre Legal na barra lateral (`Sidebar.tsx`) e nas Ações Rápidas do Dashboard com ícone de cofre (`ShieldCheck` ou `Lock` do Lucide).
  - [ ] Exibir ponto de status (verde se desbloqueado, cinza se trancado, vermelho se houver documentos com vencimento iminente).

---

## 4. Critérios de Aceitação e Definição de Pronto (DoD)

1. [ ] Nenhum arquivo armazenado na pasta `data/vault/documents/` pode ser aberto ou lido por um visualizador convencional sem a senha-mestre (conteúdo 100% cifrado em binário AES-256-GCM).
2. [ ] Se o usuário errar a senha-mestre 5 vezes consecutivas, o backend impõe atraso progressivo (rate limiting de força bruta com `time.sleep`).
3. [ ] Após 15 minutos sem requisições do frontend, a sessão é automaticamente invalidada no backend e o cofre é trancado.
4. [ ] O checklist sucessório reflete de forma fidedigna os documentos anexados e calcula a nota percentual com precisão.
5. [ ] Todos os 111 testes automatizados existentes continuam passando com êxito.

---

## 5. Estratégia de Testes

- **Testes de Segurança e Criptografia (`tests/test_legal_vault.py`)**:
  - Testar fluxo completo de cifragem e decifragem garantindo que o arquivo restaurado possui exatamente o mesmo SHA-256 do arquivo original.
  - Testar rejeição de arquivos adulterados (tentativa de alterar 1 único byte no arquivo cifrado deve disparar erro de integridade do GCM `InvalidTag`).
  - Testar derivação de chaves garantindo que senhas incorretas são rejeitadas.
  - Testar expiração de sessão por inatividade.
- **Testes de API (`tests/test_api_vault.py`)**:
  - Testar upload de PDF simulado, verificação de metadados e download descriptografado.

---

## 6. Riscos e Mitigações

| Risco Identificado | Impacto | Mitigação Arquitetural |
| :--- | :--- | :--- |
| O usuário esquecer a senha-mestre do cofre | Crítico | Geração mandatória de uma Folha de Recuperação de Emergência (*Emergency Paper Kit*) com 12 palavras-semente bip39 ou chave mestra para impressão física em papel e guarda em cofre doméstico. |
| Arquivos grandes sobrecarregarem a memória RAM durante a decifragem | Médio | Implementar processamento em *chunks* de 64 KB para arquivos maiores que 10 MB, evitando alocação excessiva de memória. |

