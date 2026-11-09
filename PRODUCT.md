# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Osmar e Vera (Casal)**: Gestão financeira familiar diária e controle patrimonial conjunto.
- **MEI Fix e MEI Facilita**: Dois microempreendedores individuais com titularidades segregadas sob gestão da família, necessitando monitoramento contínuo de faturamento e teto anual (LC 123/2006).

## Product Purpose

OpenFamilyOffice consolida o patrimônio e a tesouraria familiar (Pessoa Física) e de 2 CNPJs MEI em uma única interface segura e transparente. O objetivo é permitir que o casal confira saldos e reservas com confiança e clareza, fotografe e envie cupons fiscais e notas pelo celular, e converse naturalmente com o assistente financeiro sobre despesas e planejamento patrimonial.

## Positioning

Sistema de tesouraria familiar privada com total segregação patrimonial entre PJ e PF, conciliação fiscal e controle rigoroso de teto MEI, desenhado com privacidade local prioritária.

## Operating Context

- Acesso diário pelo smartphone (resolução ~390px) para conferência rápida de saldos e upload de cupons fiscais via câmera.
- Acesso periódico em desktop para fechamento contábil, conciliação do livro razão e análise de fluxo de caixa.
- Rotina de conciliação bancária (Inter, Caixa, Nubank) e captura de despesas em tempo real.

## Capabilities and Constraints

- **Capacidades**: Dashboard executivo com visão de liquidez multi-entidade, conciliação de cartões e extratos OFX, OCR de comprovantes/notas fiscais, monitoramento de teto MEI (limite anual de R$ 81.000,00 por CNPJ), livro razão auditável e assistente conversacional com ferramentas financeiras.
- **Restrições Rígidas**: Proibido alterar qualquer regra de negócio, rota, endpoint, lógica de cálculo, schema do banco ou dados reais/fictícios de seed. Toda intervenção é estritamente restrita à camada de apresentação, acessibilidade e experiência do usuário (UX).

## Brand Commitments

- **Nome**: OpenFamilyOffice
- **Tom de Voz**: Calmo, confiável, sóbrio, preciso, sem exageros ou sensacionalismo.
- **Idioma**: Português do Brasil (pt-BR), com formatação monetária (R$ 1.234,56) e datas (DD/MM/AAAA) padronizadas.

## Evidence on Hand

- Frontend Next.js 15 + Tailwind CSS com tema escuro e claro em `web/`.
- Backend FastAPI com 98 testes automatizados em `tests/`.
- Componentes modulares em `web/app/components/`.

## Product Principles

1. **Soberania e Confiança**: Apresentação serena, sem ruídos decorativos ou promessas enganosas.
2. **Segurança de Apresentação**: Números tabulares, alinhamento rigoroso à direita e clareza visual absoluta sobre a titularidade de cada conta (PJ vs PF).
3. **Fluidez Móvel**: Interface pensada para uso ágil com uma mão em celulares (alvos de toque ≥ 44px, upload direto e rápido).
4. **Respeito à Verdade Operacional**: Nada de claims falsos; comunicação honesta sobre conectividade e status local.

## Accessibility & Inclusion

- Conformidade com WCAG 2.1 AA (contraste mínimo de 4.5:1 para texto normal, 3:1 para elementos de interface e texto grande).
- Foco visual nítido para navegação completa por teclado.
- Rótulos e descrições acessíveis para botões e campos de entrada de dados.
- Respeito estrito a `prefers-reduced-motion`.
