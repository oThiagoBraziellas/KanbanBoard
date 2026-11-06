# KanbanBoard

Quadro Kanban com colunas e cartões, arrastar e soltar nativo (HTML5 Drag and Drop), persistência em `localStorage` e desfazer/refazer ilimitado dentro de um teto configurável. Tudo em JavaScript puro, sem dependências.

A parte interessante não é o visual, e sim o modelo: o quadro é uma estrutura imutável com operações puras, e o histórico é uma pilha de snapshots que reaproveita referências entre estados.

## Por que este projeto

Ferramentas como Trello, Jira e Linear são o exemplo clássico de interface com muito estado e interação direta. Construir um Kanban do zero mostra domínio de:

- modelagem de estado normalizado (cartões em um mapa por id, colunas guardando só ids);
- invariantes (um cartão existe em exatamente uma coluna) e como testá-las;
- desfazer/refazer, um problema recorrente em entrevistas de sistemas de editor;
- drag and drop com cálculo de posição de soltura, e uma alternativa por teclado, que é onde a maioria das implementações falha em acessibilidade.

## Recursos

- Colunas e cartões: criar, renomear, editar e excluir.
- Arrastar cartões entre colunas e reordenar dentro da coluna, com linha indicando onde o cartão vai cair.
- Alternativa por teclado: foque um cartão e use `Alt` + setas para mover, `Enter` para editar, `Del` para remover, setas para navegar.
- Desfazer (`Ctrl+Z`) e refazer (`Ctrl+Shift+Z` ou `Ctrl+Y`), também por botões. Vale para criar, editar, mover e excluir, inclusive colunas inteiras.
- Persistência automática, com saneamento dos dados lidos (cartões órfãos ou duplicados são descartados).
- Região `aria-live` que anuncia cada ação para leitores de tela.

## Como executar

Abra o `index.html` no navegador ou use um servidor local:

```bash
python3 -m http.server 8000
# acesse http://localhost:8000
```

Se o navegador bloquear ES modules em `file://`, use o servidor local.

## Como testar

Dentro desta pasta, com Node 18 ou superior:

```bash
node --test
```

Os testes cobrem todas as operações do quadro (inclusive um teste de propriedade que faz 50 movimentos e confirma que nenhum cartão some ou duplica), a pilha de histórico (descarte do ramo de refazer, teto de entradas, ausência de mutação), o saneamento do armazenamento, o cálculo do índice de soltura e os movimentos por teclado.

## Decisões de projeto

- **Estado normalizado.** `cards` é um mapa e cada coluna guarda `cardIds`. Mover um cartão é uma operação em duas listas pequenas, sem varrer o quadro todo. Excluir uma coluna também exclui seus cartões do mapa.
- **Semântica do índice em `moveCard`.** O índice de destino vale depois da remoção do cartão da origem. Isso elimina o clássico erro "off by one" ao reordenar dentro da mesma coluna e simplifica o cálculo feito a partir da posição do ponteiro.
- **Histórico por snapshots.** Como as operações são imutáveis, cada snapshot compartilha a maior parte da estrutura com o anterior, então guardar 100 estados custa pouca memória. A alternativa (guardar comandos inversos) usa menos memória, mas exige um inverso correto para cada operação.
- **Operação nula não entra no histórico.** Se o novo estado é a mesma referência, nada é empilhado. Por isso as funções devolvem o próprio quadro quando não há mudança.
- **Drag and drop nativo.** Evita bibliotecas e funciona com mouse. Em telas de toque o suporte nativo é limitado, e por isso existe a alternativa por teclado e por botões. A posição de soltura compara o ponteiro com o ponto médio de cada cartão (`dropIndex`).
- **Complexidade.** Mover, adicionar e excluir cartão: O(c) no número de cartões da coluna afetada. Desfazer e refazer: O(1) (troca de ponteiro). A renderização recria o DOM inteiro a cada mudança: simples e suficiente para centenas de cartões.

## Estrutura de pastas

```
KanbanBoard/
├── index.html
├── style.css
├── src/
│   ├── app.js        # DOM, drag and drop, teclado
│   ├── board.js      # modelo imutável e operações
│   ├── history.js    # desfazer/refazer
│   ├── storage.js    # persistência e saneamento
│   └── dnd.js        # índice de soltura e destino por teclado
├── tests/
├── package.json
├── LICENSE
└── README.md
```

## Limitações conhecidas

- O drag and drop nativo do HTML5 não funciona bem em navegadores de toque; use os botões e o teclado.
- A edição de títulos usa `window.prompt`, escolha pragmática que prioriza a lógica sobre o polimento visual.
- Não há sincronização entre abas nem entre dispositivos.
- O histórico não é persistido: ao recarregar a página, o desfazer recomeça vazio.
- Cartões têm campo `notes` no modelo, mas a interface ainda não o expõe.

## Licença

MIT. Veja o arquivo [LICENSE](LICENSE).
