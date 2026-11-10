# Padrão ASD-STE100 no OpenFamilyOffice

**Governing Standard**: Simplified Technical English (ASD-STE100) aplicado ao português.  
**Versão**: `1.1.0`  
**Escopo**: Chat executivo, relatórios do Family CFO e conciliação de comprovantes.

---

## Modos Disponíveis em Configurações e Chat

O usuário pode alternar entre 3 modos no menu **Ajustes** ou através de botões rápidos no chat:

### 1. Sem ASD (`none` - Convencional)
- Tom conversacional corporativo tradicional.
- Sem contagem de palavras rígida ou restrição formal de vocabulário.
- Preserva blindagem de dados LGPD e respostas operacionais em primeiro lugar.

### 2. 80% ASD / ASD Leve (`asd_80` - Padrão Karpathy)
*Recomendado para uso diário.*
- Frases de no máximo 20 palavras. Em descrições técnicas, máximo 25.
- Voz ativa mandatória: diga quem faz o quê no presente ou imperativo.
- Uma ideia por frase. Apresente dados e números antes da narrativa.
- Uma palavra para cada coisa: use sempre `comprovante`, `livro-razão`, `Fix Serviços MEI`, `Facilita Vistorias MEI`, `Household PF`.
- Tom natural de conversa no português do Brasil (os 20% humanos).
- **Pode usar uma analogia quando ela ajudar, mas use apenas uma.**
- Sem introdução vazia e sem conclusão cerimoniosa.

### 3. ASD Rígido (`asd_strict` - 100% ASD-STE100)
*Padrão estrito de manual aeroespacial.*
- Frases de no máximo 20 palavras sem exceção (descritivo máx. 25).
- Uma instrução ou ideia por frase. Formas compostas proibidas.
- Sem gíria, sem metáfora, sem analogias, sem sinônimos por variedade.
- Parágrafos curtos: de 1 a 4 frases.
- Sem introdução, sem conclusão e sem "em resumo".
- **Glossário no final**: liste até 3 termos técnicos usados, cada um com uma definição de uma frase.
- Se o usuário pedir "reescreve em ASD": preservar significado original sem inventar fatos; marcar ambiguidades com `[?]`.

---

## Gatilhos Dinâmicos por Mensagem

Mesmo que o modo padrão esteja configurado no sistema, o assistente comuta dinamicamente se o usuário solicitar:
- *"modo ASD"*, *"explica em ASD-STE100"*, *"reescreve em ASD"*, *"manual de avião"* -> Ativa `asd_strict`
- *"80% ASD"*, *"ASD leve"* -> Ativa `asd_80`
- *"sem ASD"*, *"modo normal"*, *"desative o ASD"* -> Ativa `none`

