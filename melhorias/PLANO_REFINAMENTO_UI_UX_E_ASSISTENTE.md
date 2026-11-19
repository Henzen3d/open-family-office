# Plano de refinamento de UI, UX e assistente do OpenFamilyOffice

**Revisão de 19/11/2026** · Base `545069e` · Plano de implementação para o Antigravity

O painel precisa responder primeiro a três perguntas da rotina de Osmar e Vera. Quanto há disponível, de qual entidade é o dinheiro e o que precisa de atenção. O assistente deve manter o fio da conversa, consultar os mesmos dados do painel e buscar informações públicas quando a pergunta exigir. A tela inicial proposta mantém a identidade atual, com menos controles concorrendo pelo primeiro olhar.

## 1. Diagnóstico

Revisei o código e abri a prévia local do frontend. Observei a página inicial e a gaveta do assistente no desktop e em viewport de 390 px, o tema claro no desktop e os estados de Livro Razão e comprovantes com a API indisponível. A prévia usou fontes de fallback. A revisão de chat, OCR, provedores e persistência se baseia no código e nos testes unitários do cliente LLM, com 6 testes existentes aprovados. A avaliação visual e técnica não usou o banco de produção, arquivos particulares nem serviços financeiros reais.

| Prioridade | Achado | Evidência e efeito |
| --- | --- | --- |
| P0 | A tela apresenta informação com mais certeza do que os dados permitem | Com a API indisponível, o painel continuou mostrando saldos e séries predefinidos, o ticker dizia “Feed em tempo real” e a gaveta dizia “Online”. Livro Razão e comprovantes exibiram estados de ausência de registros. O prompt também mistura dados consultados com números fixos e o fallback financeiro devolve uma posição de caixa fixa. Ver [painel](../web/app/page.tsx#L110), [gráfico](../web/app/components/dashboard/BentoLiquidityChart.tsx#L154), [ticker](../web/app/components/MarketTicker.tsx#L177), [gaveta](../web/app/components/dashboard/AssistantDrawer.tsx#L112) e [roteador](../src/llm/smart_router.py#L843). |
| P0 | Algumas ações prometem um efeito maior que o implementado | “Enviar PIX” leva à provisão e o handler adiciona uma linha em memória. O aceite da governança também muda estado local e insere uma linha com status confirmado. O modal PIX explica o papel do app do banco, mas o retorno da ação promete registro. Ver [handlers](../web/app/page.tsx#L263) e [modal PIX](../web/app/components/dashboard/QuickPixCard.tsx#L205). |
| P0 | A sanitização do turno cobre um caminho diferente do contexto financeiro | `execute_chat` sanitiza a entrada do usuário e envia `sys_prompt` por outro argumento. O prompt inclui identificação de titulares, saldos e trechos de lançamentos e cupons. O mesmo contexto é montado para perguntas gerais que chegam ao provedor. É necessário controlar a saída do payload completo antes de adicionar histórico e pesquisa web. Ver [montagem do prompt](../src/llm/smart_router.py#L158), [sanitização](../src/llm/smart_router.py#L342) e [chamada externa](../src/llm/smart_router.py#L817). |
| P1 | A navegação compete com as tarefas diárias | No celular, o ticker, a busca, os filtros e o câmbio ocupam a parte superior. As faixas horizontais escondem entidades e ações. No desktop, a busca exibe um atalho sem fluxo de resultados no componente, o botão da semana é fixo e o seletor global de moeda é instanciado sem callback ou cotação. Ver [cabeçalho](../web/app/components/dashboard/DashboardHeader.tsx#L50) e [seletor de moeda](../web/app/components/cross_border/CurrencyToggle.tsx#L13). |
| P1 | O chat mostra uma conversa que o servidor não recebe | As mensagens ficam no estado da página. O POST carrega mensagem atual, entidade, estilo e `stream: false`. A entidade inicial do chat é Inter PJ, separada do filtro inicial Consolidado. “E no mês anterior?” chega sem o período, a entidade ou o assunto implícitos. Ver [estado](../web/app/page.tsx#L127), [POST](../web/app/page.tsx#L453) e [contrato](../src/web/routers/chat_router.py#L93). |
| P1 | Há funções financeiras, mas a decisão de usá-las é majoritariamente rígida | `SmartRouter` executa vários ramos por frases e expressões regulares, com retorno antes do LLM. O cliente universal envia um turno e interpreta texto, sem contrato de chamadas e resultados de ferramentas pelo modelo. Há integrações de mercado e RSS, porém falta uma ferramenta geral de busca pública com fontes no chat. Ver [funções locais](../src/intelligence/assistant_tools.py), [roteador](../src/llm/smart_router.py#L329), [cliente](../src/llm/client.py#L28), [mercado](../src/intelligence/market_feed.py) e [notícias](../src/intelligence/news_rss.py). |
| P1 | A interface do assistente comunica lançamento antes de conversa | O botão desktop diz “Anexar Cupom Fiscal” e abre a gaveta. Dentro dela, “Lançar em” seleciona a conta mesmo numa pergunta de leitura. Os atalhos após a primeira mensagem são fixos, o texto é renderizado como parágrafo simples e o carregamento anuncia consulta ao Livro Razão em todos os casos. O SSE disponível no backend começa depois que a resposta já foi calculada e fatia o texto com atraso artificial. Ver [entrada](../web/app/page.tsx#L656), [gaveta](../web/app/components/dashboard/AssistantDrawer.tsx#L389) e [SSE](../src/web/routers/chat_router.py#L170). |
| P1 | A revisão de anexos e simulações precisa representar o estado real | O upload via chat interpreta o JSON como sucesso sem checar o status HTTP. A extração de artefatos também pode gerar uma simulação com parâmetros fixos ao encontrar termos como “IPCA”. O usuário pode confundir um dado de exemplo ou uma extração parcial com o resultado da sua pergunta. Ver [upload](../web/app/page.tsx#L423) e [artefatos](../src/web/routers/chat_router.py#L30). |

Vale preservar a separação visual entre Família, Fix e Facilita, os valores tabulares, as rotas de Livro Razão e comprovantes e a revisão humana dos lançamentos sugeridos. São os elementos que ligam a interface à rotina financeira do casal.

## 2. Direção de produto e interface

| Área | Proposta |
| --- | --- |
| Visão geral | Barra compacta com **Visão geral**, entidade e período. Primeira dobra com **Saldo disponível**, data do saldo, resumo curto de entradas e saídas quando disponíveis e ação **Adicionar comprovante**. Em seguida, **Pendências** com itens reais que levam à fila filtrada. |
| Áreas de detalhe | **Livro Razão** para buscar, filtrar e conciliar. **Comprovantes** para receber, revisar e vincular. **Análises** para caixa, patrimônio, mercado e simuladores. **Configurações** para contas, aparência e provedores. Usar as rotas e serviços existentes sempre que couber. |
| Navegação móvel | Rótulos legíveis para Início, Livro Razão, Comprovantes e Assistente. Acesso secundário para Análises e Configurações. Um seletor compacto torna as três entidades acessíveis sem arrastar uma faixa escondida. A câmera fica acessível com uma mão, perto do compositor e no fluxo de comprovantes. |
| Identidade visual | Preservar a paleta do [sistema de design](../DESIGN.md). Reservar o índigo para seleção e ação principal. Usar cor com texto ou ícone para estados, reduzir pílulas e contornos redundantes e dar contraste a subtítulos, rótulos e valores. A interface deve continuar legível com as fontes de sistema. |
| Assistente | Entrada explícita **Assistente**. Gaveta para consultas rápidas no desktop e interface de altura útil completa no celular, com compositor acima do teclado. Mostrar a entidade da consulta em um controle compacto. Exibir **Conta do lançamento** no rascunho ou na revisão do comprovante. Estilo padrão em português natural, com ASD disponível no menu **Estilo da resposta**. |
| Cobertura e fontes | Mostrar informação local com entidade e período. Para fontes públicas, apresentar links e data de referência ou consulta. Na própria resposta, usar estado breve quando for relevante, como “Consultando lançamentos” ou “Buscando fontes públicas”, ligado ao trabalho executado. |

### Perguntas adicionais e sugestões de continuidade

- **Pergunta adicional** resolve um dado indispensável. Diante de “Registra 189,90 de material”, pedir a entidade quando ela estiver ambígua. Oferecer **Fix**, **Facilita** e **Família**, mantendo a caixa de texto livre para “foi metade em cada” ou outro detalhe. O clique continua o mesmo turno e leva a um rascunho revisável.
- **Sugestão de continuidade** aparece em uma resposta concluída quando há um próximo passo ligado ao resultado. Em “Três despesas da Facilita aguardam comprovante”, oferecer **Ver as três despesas** ou **Vincular comprovante**. Renderizar até três opções abaixo da resposta pertinente, sem faixa fixa que concorra com o compositor.
- **Atalhos de início** ficam na abertura sem histórico. Exemplos úteis incluem **Revisar pendências do mês** e **Consultar saldo da Família**. Eles preenchem uma pergunta explícita ou abrem a tela correspondente, conforme o rótulo.

### Arquitetura proposta para o assistente

1. O backend recupera o contexto local da conversa e resolve entidade, conta e período. Dúvidas genuínas viram pergunta adicional. O frontend recebe texto e componentes validados com o mesmo contrato para JSON e SSE.
2. O modelo escolhe entre responder com o contexto permitido, pedir esclarecimento e solicitar ferramentas registradas. O backend valida parâmetros, autorização, entidade e finalidade, executa a função e devolve um resultado tipado ao modelo para síntese. O motor financeiro continua responsável pelos números. Reaproveitar o cliente universal e adaptar cada protocolo com testes de capacidade por configuração.
3. A consulta local devolve apenas os campos necessários ao turno. A pesquisa pública recebe uma consulta minimizada, construída a partir da parte pública do pedido. Em perguntas mistas, o resultado público e o privado são associados dentro do app. Links e citações vêm das evidências registradas pelo backend.
4. Operações de escrita são apresentadas como rascunhos com entidade, conta, categoria, valor e data editáveis. A confirmação explícita usa o caminho de gravação do servidor, com revalidação e deduplicação. O usuário vê o identificador e o estado da gravação. Pesquisa web opera em leitura de fontes públicas.

## 3. Plano de tarefas para o Antigravity

O escopo de UI preserva as regras e fórmulas descritas no [contexto do produto](../PRODUCT.md). A trilha do assistente prevê evolução compatível do protocolo de chat, dos adaptadores LLM e das integrações para atender ao pedido de contexto, ferramentas e internet. Cada entrega deve funcionar pelos pontos de entrada normais do app, com base sintética isolada e sem dependência de um serviço bancário real.

### T01 · Corrigir estados e promessas de interface · P0

- [ ] Mapear saldos, séries, teto MEI, mercado, patrimônio e status de conectividade. Para cada indicador, distinguir `carregando`, `disponível`, `último dado conhecido`, `sem registros` e `indisponível`. Rotular explicitamente qualquer modo demonstração. Usar a data da posição para escolher o período inicial em `America/Sao_Paulo`.
- [ ] Retirar números fixos do fallback financeiro e afirmações de sincronização sem evidência. Manter consultas locais determinísticas quando a fonte existir e sinalizar resultado parcial ou falha de provedor sem expor erro interno. Conferir que dado de faturamento, saldo bancário e patrimônio continuam distintos.
- [ ] Renomear “Enviar PIX” para **Provisão de PIX** e identificar o estado local até existir gravação verificável. Tratar a homologação conjugal atual como prévia até haver registro de aprovações reais. Revisar botões sem ação e indicadores inconsistentes como busca, semana e moeda global.
- [ ] **Aceite** — com API indisponível, nenhuma tela financeira mostra dados de exemplo como atuais ou “Online” fixo, nem afirma que um rascunho local foi salvo. Um saldo real de R$ 0,00 e uma consulta sem dados têm estados diferentes.

### T02 · Reordenar painel, navegação e revisão · P1 · após T01

- [ ] Aplicar a composição proposta no desktop e no celular. Priorizar saldo, contexto e comprovante antes de gráficos. Levar ticker, governança, simuladores e câmbio para páginas ou seções de detalhe. Expor busca funcional em Livro Razão e ligar o seletor global de moeda somente às vistas que converterem valores com uma fonte documentada.
- [ ] Criar uma entrada **Pendências** ligada aos estados de comprovante e fechamento existentes. Reaproveitar filtros e URLs para abrir a lista já no período e na entidade corretos. Padronizar **Importar extrato**, **Adicionar comprovante**, **Revisar** e **Conciliar**.
- [ ] Harmonizar cabeçalho, foco, estados de carregamento, ausência e falha nas rotas `/`, `/ledger` e `/receipts`. Rever botões apenas com ícone, alvos de 44 px em controles móveis prioritários, contraste, movimento reduzido e cobertura por barras fixas ou pelo teclado virtual. Garantir navegação e fechamento de modais por teclado com retorno de foco.
- [ ] **Aceite** — a 390 px, saldo com entidade e ação de comprovante aparecem na primeira dobra com dados de teste. A 320 px, painel e chat fluem sem rolagem lateral da página, mantendo tabelas largas em contêiner próprio. No desktop, o filtro de entidade e o caminho até a fila ficam explícitos.

### T03 · Limitar dados enviados e proteger o escopo · P0 · antes de T04, T05 e T07

- [ ] Remover a inclusão automática de lançamentos, cupons e saldos no prompt geral. Reusar `PIISanitizer` dentro de uma política explícita de saída para cada destino. Aplicar a política ao prompt final, histórico, anexos derivados, argumentos, resultados de funções, consulta pública e metadados. Restringir dados privados a projeções mínimas autorizadas e manter a resolução de identificadores no servidor.
- [ ] Verificar a fronteira de acesso do ambiente implantado e validar no backend o escopo de conversa, entidade, conta e registro. Tratar Consolidado como escopo de leitura. Associar o histórico de conversa à sessão local autorizada. Armazenar somente o necessário e oferecer exclusão da conversa.
- [ ] Checar o que sai em logs, eventos, erros, cache e telemetria com dados sentinela sintéticos. Em falha de um provedor, conservar o mesmo limite de dados no próximo e informar a redução de capacidade.
- [ ] **Aceite** — testes capturam o payload HTTP efetivamente enviado e comprovam que perguntas gerais não carregam extratos ou comprovantes, que o destino de pesquisa recebe somente termos públicos e que a troca de entidade não amplia o acesso do turno anterior.

### T04 · Dar continuidade à conversa · P1 · após T03

- [ ] Introduzir identificador de conversa, janela de contexto limitada e estado de assunto, entidade, conta, período e esclarecimento pendente. Começar com sessão local no servidor e ciclo de vida explícito. Reavaliar retenção durável quando houver necessidade de retomar conversas entre dispositivos. Manter compatibilidade com chamadas atuais de mensagem única.
- [ ] Resolver entidades e contas por códigos canônicos e aliases. Herdar o contexto visível ao abrir a gaveta, mostrar a troca de escopo e manter a entidade explícita da pergunta. Desambiguar referências como “a outra empresa” antes de uma ação quando houver mais de uma interpretação.
- [ ] Adotar tom **Natural** para novas conversas como proposta de produto, com estilos atuais acessíveis e preferências salvas preservadas. Distinguir a preferência persistida da instrução do turno e alinhar o nome `asd_mode` entre UI e API. Incluir simuladores apenas quando a intenção e os parâmetros forem válidos e marcar premissas assumidas.
- [ ] **Aceite** — “Quanto a Fix gastou em outubro?” seguido de “E em setembro?” preserva Fix, métrica e ano. “Agora da Facilita” preserva a métrica e o último período e troca a entidade. “Explica de outro jeito” continua a conversa usando a evidência do turno anterior.

### T05 · Migrar para chamadas de ferramentas reais · P1 · após T03 e T04

- [ ] Criar registro tipado a partir das funções existentes. Começar com saldo, lançamentos, comprovantes pendentes e teto MEI. Em seguida, fechamento, mercado e simuladores. Para cada função, declarar parâmetros permitidos, escopo, limites de resultados, origem, período, estado de erro e se a ação é leitura ou proposta.
- [ ] Adaptar `UniversalLLMClient` para mensagens, schemas e resultados correlacionados por chamada. Validar primeiro uma configuração que suporte chamadas nativas. Ampliar os protocolos usados no app conforme testes de contrato. Preservar roteamento, fallback, cooldown e OCR, com limite de chamadas, tempo e orçamento por turno. Um provedor apenas de texto pode atender conversas simples sem afirmar que executou ferramentas.
- [ ] Pedir ao modelo a seleção e síntese de uma ou mais funções. Reaproveitar as rotinas determinísticas para cálculo e operações conhecidas, retirando gradualmente os atalhos que capturam pedidos compostos. Para propostas de despesa, receita e correção, revalidar no servidor e tornar a confirmação idempotente.
- [ ] **Aceite** — uma mesma intenção escrita de três formas diferentes usa o mesmo resultado autorizado. “Compare as despesas das duas empresas e liste só as pendências da Facilita” combina consultas e responde aos dois pedidos. Duplo clique, retry e troca de provedor gravam cada proposta confirmada no máximo uma vez.

### T06 · Redesenhar a experiência da gaveta · P1 · estrutura visual após T01, integração após T04 e T05

- [ ] Trocar a entrada desktop para **Assistente** e manter **Adicionar comprovante** como ação objetiva. Separar o formato da resposta de ações, fontes, cartões e metadados técnicos. Renderizar Markdown restrito com links seguros, listas e tabelas legíveis. Preservar cartões existentes com validação de tipo e conteúdo no servidor.
- [ ] Incluir contrato opcional para esclarecimentos e sugestões, com pergunta, opções, identificador e ação permitida. Usar opções em resposta a uma ambiguidade concreta e sugestões ligadas ao conteúdo. Permitir continuar digitando, editar rascunho e descartar proposta.
- [ ] Usar estados reais em JSON e SSE, começando com eventos de progresso e resultado final. Mostrar texto incremental quando o provedor realmente oferecer streaming. Remover a latência artificial, permitir parar ou tentar novamente e conservar a pergunta, o rascunho e o anexo. Tratar HTTP de erro, OCR parcial e upload sem retorno como estados recuperáveis distintos.
- [ ] **Aceite** — pelo celular, é possível abrir o assistente, fotografar ou escolher um comprovante sintético, ver miniatura e conta selecionada, corrigir valor, confirmar e abrir o registro no Livro Razão. Uma falha no upload conserva o anexo para nova tentativa. A gaveta fecha por teclado, devolve o foco e mantém o compositor visível acima do teclado virtual.

### T07 · Dar acesso à internet com fontes rastreáveis · P1 · após T03 e T05

- [ ] Registrar **Consultar mercado** com os serviços existentes de BCB/câmbio. Adicionar **Pesquisar na web** por uma interface de backend própria, começando com um único provedor configurável e leitura de fontes públicas. Validar custo, cota, latência, requisitos de retenção e disponibilidade para escolher o adaptador. Usar fontes oficiais quando aplicável, como Banco Central, IBGE, Receita Federal e Portal do Empreendedor.
- [ ] Definir **Automático**, **Pesquisar na web** e **Somente dados locais**. No automático, buscar quando a tarefa pedir fatos públicos atuais ou evidência externa. Manter desligamento por configuração e degradação explícita quando a pesquisa estiver indisponível. Mostrar fonte, título, URL validada e datas de referência e consulta quando disponíveis.
- [ ] Isolar o serviço de busca do banco, dos anexos e dos segredos do app. Tratar textos de páginas e documentos como dados. Validar URLs e redirecionamentos, negar acesso a hosts internos e limitar tamanho, tipos de resposta e tempo. Restringir ações a leitura pública. Usar o motor local para calcular comparações com valores privados e vincular os resultados à resposta sem enviar os valores ao serviço de pesquisa.
- [ ] **Aceite** — “Qual foi a última decisão do Copom? Use fonte oficial” traz data de referência e link do Banco Central quando disponível. “Compare com minha reserva” mantém a posição financeira dentro do fluxo local. A ausência de evidência é informada e uma página externa não consegue disparar ações ou ampliar o acesso do assistente.

### T08 · Incorporar melhorias úteis à rotina · P2 · após validar T02 e T06

- [ ] **Explicar este número** em saldo e teto MEI. Abrir o assistente com referência ao indicador, entidade e período para mostrar os registros que sustentam o cálculo, respeitando a permissão do usuário.
- [ ] **Retomar revisão** na fila de comprovantes e no fechamento. Apresentar quantos itens foram revisados e pendências restantes a partir de estados persistidos. Dar acesso direto ao próximo item aplicando o filtro correspondente.
- [ ] **Reabrir consulta em outra entidade** no chat. Exibir a mudança explícita de escopo e reutilizar somente parâmetros compatíveis. Avaliar tela dedicada de conversa e histórico durável depois de observar uso recorrente da gaveta.
- [ ] **Aceite** — cada melhoria reduz passos em uma jornada testada e abre um estado real. Avaliar com Osmar e Vera qual ganho justifica entrar primeiro no produto.

### T09 · Validar e liberar em etapas · transversal

- [ ] Criar fixtures sintéticas para as três entidades e cenários vazio, parcial, offline e desatualizado. Deixar provedores e pesquisa simulados nos testes automatizados. Conferir caminhos com `DATA_DIR` e paths padrão antes de iniciar os testes, inclusive rotinas que ainda usam `data/` diretamente. Rodar testes relevantes do backend, build e verificação de tipos do frontend.
- [ ] Percorrer as jornadas de consulta de saldo, filtro de pendências, importação, comprovante, confirmação e auditoria mensal. Cobrir 320, 390, 768 e 1280 px, temas claro e escuro, teclado, zoom e viewport com teclado móvel. Medir contraste WCAG AA e revisar os estados de foco.
- [ ] Usar uma matriz conversacional versionada com perguntas de leitura, continuação, ambiguidade, ferramentas, pesquisa atual, tentativa de alteração por fonte externa, timeout e indisponibilidade. Verificar origem das cifras, contexto, links e duplicidades. Registrar tempos até o primeiro sinal de atividade e até a resposta final, separados por consulta local, provedor e internet.
- [ ] Usar como metas iniciais de aceite saldo e entidade visíveis na primeira dobra a 390 px, acesso à captura em até dois toques desde a página inicial, 100% dos casos críticos de escopo e confirmação aprovados, e ao menos 9 de 10 casos representativos de continuidade aprovados. Medir a linha de base de latência com as mesmas fixtures antes de estabelecer metas de p95.
- [ ] Liberar por etapa. Primeiro T01 e T03 para confiança e privacidade. Depois T02 e a estrutura visual de T06, em paralelo à continuidade de T04 quando as bases estiverem prontas. Completar T05 e a integração de T06 antes de habilitar T07. Avaliar T08 pelo ganho observado. Manter ativação independente de chamadas e pesquisa para poder voltar ao modo local durante a validação.

## Referências técnicas

- Contrato de chamadas e resultados de ferramentas. [OpenAI Function calling](https://developers.openai.com/api/docs/guides/function-calling) e [Gemini Function calling](https://ai.google.dev/gemini-api/docs/function-calling).
- Fronteira para conteúdo externo e validação das requisições. [OWASP LLM Prompt Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html) e [OWASP Server-Side Request Forgery Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html).
- Adaptação da interface a telas estreitas e foco com conteúdo fixo. [W3C Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) e [W3C Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html).
