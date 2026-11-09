---
name: OpenFamilyOffice
description: Gestão patrimonial familiar sóbria e executiva (Casal + 2 MEIs)
colors:
  primary: "#4F5BE2"
  primary-hover: "#3F48CC"
  background-light: "#F4F6FB"
  background-dark: "#0c1017"
  surface-card-light: "#FFFFFF"
  surface-card-dark: "#161c28"
  surface-container-dark: "#1a202c"
  border-light: "#E2E8F0"
  border-dark: "rgba(255, 255, 255, 0.08)"
  text-primary-light: "#0F172A"
  text-primary-dark: "#F8FAFC"
  text-muted-light: "#64748B"
  text-muted-dark: "#94A3B8"
  success: "#10B981"
  warning: "#F59E0B"
  danger: "#EF4444"
typography:
  display:
    fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
  headline:
    fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  tabular:
    fontFamily: "'JetBrains Mono', monospace"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "6px"
  md: "12px"
  lg: "16px"
  xl: "24px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  card:
    backgroundColor: "{colors.surface-card-dark}"
    rounded: "{rounded.xl}"
    padding: "20px"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "10px 16px"
---

# Design System

<!-- impeccable:design-schema 1 -->

## Overview
OpenFamilyOffice adota uma estética executiva, sóbria e focada em densidade de dados e clareza patrimonial. O modo primário é **Operate**: interfaces funcionais onde legibilidade, precisão numérica e rapidez de decisão prevalecem sobre adornos visuais.

## Colors
- **Primária**: Índigo sóbrio (`#4F5BE2` / `#3F48CC`), utilizado para ações de navegação e pontos focais de ação primária.
- **Superfícies**: Fundo escuro profundo (`#0c1017`) com cartões em tonalidades frias elevadas (`#161c28`, `#1a202c`). Fundo claro alternativo (`#F4F6FB`) com cartões brancos puros (`#FFFFFF`).
- **Semântica Financeira**:
  - Positivo / Receitas: Verde Esmeralda (`#10B981`)
  - Alerta / Teto MEI em aproximação: Âmbar (`#F59E0B`)
  - Crítico / Ultrapassagem / Saídas: Vermelho Carmesim (`#EF4444`)
  - Neutro / Transferências internas entre contas da família: Ardósia/Azul Neutro (`#64748B`)

## Typography
- **Família Principal**: Plus Jakarta Sans / Inter / Segoe UI para títulos e navegação.
- **Família Monospaçada / Numérica**: JetBrains Mono para todos os valores monetários, datas fiscais, CNPJs e percentuais de teto, garantindo alinhamento tabular e legibilidade contábil imediata.
- **Hierarquia**: Títulos de seção contidos (text-lg a text-xl), subtítulos muted com indicação de entidade (PJ vs PF), rótulos de métrica text-xs uppercase com tracking moderado.

## Layout
- **Responsividade**: Mobile-first com adaptação para desktop via Bento Grid refinado.
- **Alvos de Toque**: Todos os botões, disparadores de modal e inputs possuem no mínimo 44x44px em resoluções de smartphone (≤ 640px).
- **Tabelas e Extratos**: Rolagem horizontal autônoma com cabeçalho fixo ou sticky para manter o contexto visual de colunas.

## Elevation & Depth
- Camadas visuais baseadas em tonalidades (`surface-card` e `surface-container`) e bordas suaves sutis (`rgba(255, 255, 255, 0.08)` no tema escuro, `#E2E8F0` no claro).
- Sombras suaves contidas para modais e gavetas (`box-shadow: 0 12px 36px -4px rgba(0, 0, 0, 0.45)`).

## Shapes
- Cartões com raio suave de 16px a 20px (`rounded-2xl` / `rounded-3xl`), transmitindo acabamento moderno e executivo.
- Botões e inputs com raio de 8px a 10px (`rounded-lg` / `rounded-xl`).
- Badges de status com bordas arredondadas completas (`rounded-full`).

## Components
- **Card de Entidade**: Cartão de liquidez que discrimina com clareza o titular (MEI Fix, MEI Facilita ou PF) com código de cores e identificadores textuais explícitos.
- **Barra de Progresso do Teto MEI**: Indicador com marcação de zonas (Seguro < 80%, Atenção 80%-95%, Crítico > 95%), sempre com percentual e valor restante em R$.
- **Gaveta do Assistente (Chat)**: Painel lateral ou gaveta inferior móvel para conversação ágil, com botão de anexo/câmera acessível com o polegar.
- **Extrato do Livro Razão**: Lista de transações com ícone semântico, descrição, categoria fiscal e valor numérico estritamente alinhado à direita.

## Do's and Don'ts
- **DO**: Sempre alinhar números e valores monetários à direita e usar algarismos tabulares (`font-mono` / `tabular-nums`).
- **DO**: Garantir que toda cor semântica (verde/vermelho) seja acompanhada de um sinal (`+`/`-`), ícone ou rótulo textual legível.
- **DON'T**: Não usar gradientes decorativos pesados de roxo a azul ou ilustrações genéricas que disfarcem a seriedade dos dados.
- **DON'T**: Nunca afirmar claims inverídicos (como "Air-Gapped" ou "100% Blindado" se houver integração externa ou nuvem).
- **DON'T**: Não compactar alvos de toque em telas móveis abaixo de 44px.

