# Plano de implementação do RPG de mesa

**Status atual** — mesa, retratos, monstros e profissões implementados e validados no Chrome.

Atualizar este arquivo ao concluir cada etapa. Marcar as entregas verificadas e registrar decisões que mudem o escopo ou o modo de uso.

## Como será usado na sessão

O mestre cria as fichas, prepara um cenário com imagem e texto de abertura e escolhe quais personagens entram no mapa. Ao clicar em **Abrir projeção**, o navegador abre uma janela que pode ser movida para o segundo monitor ou projetor. O mestre arrasta os tokens no painel principal e a projeção acompanha o movimento durante o arraste. A projeção mostra o cenário e os tokens, com opção de tela cheia.

## Como iniciar

1. Abra `index.html` no Chrome. A mesa começa com o cenário **Ruínas do Musgo** e três fichas de exemplo.
2. Use **Personagens** para preparar as fichas e **Cenários** para importar o mapa da sessão. Na aba **Mesa**, selecione o cenário ativo e escolha os personagens do mapa em **Tokens na mesa**.
3. Clique em **Abrir projeção**, leve a janela ao projetor e clique em **Tela cheia**. Mova os tokens no painel do mestre arrastando ou usando as setas do teclado quando um token estiver em foco.
4. Se recarregar o painel com a projeção aberta, clique novamente em **Abrir projeção** para sincronizar a janela. Se o navegador bloquear a abertura, permita o pop-up do painel.

Use o mesmo perfil do navegador e abra o painel no mesmo endereço para continuar a sessão. Se o navegador restringir o salvamento ao abrir o arquivo diretamente, abra um terminal na pasta do projeto, execute `python -m http.server 8000 --bind 127.0.0.1` e acesse `http://127.0.0.1:8000/` no navegador. Cada endereço tem seu próprio armazenamento.

### Retratos, monstros e profissões

- Na ficha, use **Retrato do personagem** para escolher uma imagem do computador. A mesa mostra o recorte central do retrato dentro do token. Fichas sem retrato usam iniciais.
- Em **Monstros**, cadastre a criatura com nome, vida máxima, cor e retrato opcional. **Colocar na mesa** cria uma cópia numerada no cenário ativo. Também é possível adicionar cópias pelo seletor de monstros da mesa. Cada cópia pode ser movida ou retirada individualmente.
- Retratos GIF de personagens e monstros exibem a animação original na mesa e na projeção. Para animar um retrato que foi salvo como imagem estática, importe novamente o arquivo GIF original.
- A ficha do personagem guarda o **Retrato original** e uma galeria separada em **Animações do token**. Use **Adicionar GIFs** para incluir vários arquivos. Na mesa, clique no token para escolher uma animação ou **Voltar ao retrato original**. A escolha é salva para o token naquele cenário e refletida na projeção.
- Em **Profissões**, crie as etiquetas. Depois, marque uma ou mais na ficha do personagem para exibi-las no cartão. Editar uma profissão atualiza as etiquetas associadas. Excluir a profissão remove a etiqueta das fichas que a usam.

### Tamanho, posição e vida dos tokens

- Em **Mesa → Tokens na mesa**, escolha **Todos os tokens** ou selecione um token e use os botões **−** e **+**. O ajuste geral é salvo por cenário. O ajuste individual é relativo ao tamanho geral.
- Use o botão **×** para tirar um token do mapa. Em **Tokens retirados**, clique em **Recolocar** para restaurá-lo na última posição. Os outros tokens ficam nas posições que ocupavam.
- A vida atual e máxima aparecem acima dos tokens de personagens na mesa e na projeção. Edite a vida na ficha para atualizar o valor.

### Névoa do mapa

- Na **Mesa do mestre**, clique em **Névoa → Cobrir** e arraste no mapa para marcar a área. A seleção aparece apenas no painel até você soltar o ponteiro. Ao soltar, a projeção passa a mostrar a área opaca, e o mestre continua vendo o mapa sob a sombra.
- Use **Revelar** e arraste para abrir uma parte da área coberta. Clique em **Névoa** novamente para voltar a mover os tokens. O centro do token define quando ele some ou reaparece na projeção.
- A cobertura fica salva por cenário e acompanha o tamanho da janela de projeção.

### Itens

- A aba **Itens** começa com o **Baú**. Use **Novo item** para cadastrar um objeto com nome, imagem opcional e anotações do mestre.
- Clique em **Colocar na mesa** para adicionar uma cópia ao cenário ativo. Os itens usam os mesmos controles de movimento, tamanho, retirada e névoa dos demais tokens. As anotações aparecem no catálogo do mestre.

### Zoom, enquadramento e rotação do mapa

- Na **Mesa do mestre**, use **−** e **+** acima do mapa para ajustar o zoom entre 100% e 600%.
- Com o mapa ampliado, ative **Mover mapa** e arraste o cenário para escolher o trecho que aparece na projeção. Clique em **Mover mapa** novamente para voltar a mover tokens ou escolha **Mapa inteiro** para restaurar a visão geral.
- O zoom e o enquadramento são salvos por cenário. Durante a ampliação, as duas janelas mostram a mesma região, com barras quando necessário para ajustar a projeção à tela.
- Use **Rotação** para girar o mapa de **0° a 359°**. A projeção acompanha o giro em tempo real. A névoa e a posição dos tokens acompanham o terreno, e os retratos e rótulos permanecem na vertical. A rotação é salva por cenário e preservada ao clicar em **Mapa inteiro**.

## Etapas

1. [x] **Planejamento.** Definir o fluxo da sessão, o escopo inicial e os testes de aceitação.
2. [x] **Estrutura e salvamento.** Criar `index.html`, `projecao.html`, `styles.css` e `app.js`. Organizar o painel em fichas, cenários e mesa. Salvar os dados no navegador e incluir um cenário de exemplo para testar o fluxo.
3. [x] **Fichas.** Criar, editar e excluir personagens. Usar nome, conceito ou classe, vida atual e máxima, atributos de livre preenchimento e anotações. Cada ficha gera um token identificável por iniciais e cor.
4. [x] **Cenários.** Criar, editar e excluir cenários. Cada cenário terá nome, imagem importada do computador, texto de abertura e anotações do mestre. Selecionar o cenário ativo e adicionar ou remover seus tokens. Guardar as posições por cenário.
5. [x] **Mesa e projeção.** Abrir a janela a partir de um botão no painel. Enviar o estado inicial, as trocas de cenário e as posições dos tokens em tempo real entre as duas janelas. Se a projeção for fechada, reabri-la com o estado atual.
6. [x] **Rolagem rápida.** Adicionar rolagem de d6 e d20 com resultado no painel do mestre.
7. [x] **Validação.** Executar os testes de aceitação, corrigir os problemas e documentar como iniciar e projetar a mesa.
8. [x] **Retratos.** Permitir importar, substituir e remover imagens de personagens e monstros. Exibir o retrato no painel e na projeção.
9. [x] **Monstros.** Criar um catálogo e permitir adicionar várias cópias da mesma criatura por cenário. Persistir a posição de cada uma e sincronizar seus movimentos com a projeção.
10. [x] **Profissões.** Criar um catálogo de etiquetas associáveis às fichas e manter a compatibilidade com dados já salvos.
11. [x] **Controles de tokens.** Ajustar o tamanho geral e individual, preservar as posições ao retirar tokens e exibir a vida acima dos personagens.
12. [x] **Névoa do mapa.** Cobrir e revelar áreas, ocultar tokens cobertos na projeção e salvar a cobertura por cenário.
13. [x] **Itens.** Criar um catálogo com um baú inicial e permitir cadastrar e posicionar objetos no mapa.
14. [x] **Enquadramento do mapa.** Ampliar, reduzir e mover o mapa com sincronização entre a mesa do mestre e a projeção.
15. [x] **Rotação do mapa.** Girar o cenário em qualquer grau inteiro do círculo e manter a projeção, o arraste e a névoa sincronizados.

## Decisões iniciais

- HTML, CSS e JavaScript puro, com os dados locais e as duas janelas no mesmo navegador. A primeira versão atende a uma mesa presencial controlada pelo mestre.
- Fichas genéricas para poder usar as regras da campanha. Rolagem de dados manualmente acionada, sem automatizar combate ou turnos.
- Comunicação entre as janelas via `postMessage`. As posições são guardadas em relação à área da imagem para alinhar os tokens mesmo com tamanhos de janela diferentes. O movimento é enviado durante o arraste e a posição final é gravada ao soltar o token.
- O salvamento deve funcionar no mesmo perfil e endereço local entre sessões. Verificar a abertura direta de `index.html` no navegador alvo. Se o navegador restringir o armazenamento no modo `file://`, documentar a execução com um servidor local de arquivos estáticos.

## Testes de aceitação executados no Chrome

- [x] Criar e editar uma ficha, importar um cenário e confirmar que os dados continuam disponíveis depois de recarregar o painel aberto via `file://`.
- [x] Abrir a projeção em uma janela separada e arrastar um token. A projeção acompanha o arraste e mantém o token no local correspondente ao redimensionar a janela.
- [x] Trocar de cenário com a projeção aberta e confirmar que ela passa a mostrar a imagem e os tokens corretos. Ao voltar ao primeiro cenário, as posições anteriores são restauradas.
- [x] Fechar e reabrir a projeção e confirmar que ela carrega o cenário ativo com as posições atuais. As anotações do mestre ficam visíveis somente no painel principal.
- [x] Excluir uma ficha usada na mesa e confirmar a remoção do token. Editar e excluir um cenário com a projeção aberta.
- [x] Ativar e desativar a grade e a tela cheia, rolar d6 e d20 e verificar que o painel cabe na largura de uma tela móvel.
- [x] Abrir dados salvos no formato anterior, importar um retrato, removê-lo e confirmar o retorno das iniciais nas duas janelas.
- [x] Importar GIFs de personagem e monstro, verificar a alternância dos quadros na mesa e na projeção e confirmar que os GIFs continuam salvos ao recarregar.
- [x] Salvar um retrato original e dois GIFs na ficha, escolher um por clique, arrastar o token, recarregar, restaurar o retrato original e remover um GIF da galeria.
- [x] Colocar duas cópias do mesmo monstro no mapa, mover uma durante a projeção, recarregar e verificar as posições. Retirar uma cópia da mesa sem retirar a outra.
- [x] Cadastrar duas profissões, associá-las à mesma ficha e verificar a atualização das etiquetas após renomear e excluir uma profissão.
- [x] Ajustar o tamanho de todos os tokens e de um personagem, verificar a projeção e atualizar a vida pela ficha. Retirar e recolocar um personagem e uma cópia de monstro nas coordenadas salvas, incluindo após recarregar.
- [x] Cobrir áreas sobrepostas, revelar parte delas e verificar a diferença entre mestre e projeção. Mover um token para dentro e para fora da névoa e restaurar a cobertura ao recarregar ou trocar de cenário.
- [x] Abrir um salvamento antigo e verificar o baú inicial. Cadastrar um item com imagem, mover o baú na projeção, recarregar e excluir o item do catálogo.
- [x] Comparar o recorte nas duas janelas durante o arraste e após redimensionar a projeção. Verificar a névoa em zoom, o salvamento do enquadramento e o retorno ao mapa inteiro.
- [x] Mover um personagem e o enquadramento, retirar um baú e confirmar que os demais tokens e o enquadramento permanecem nas posições atuais na mesa e na projeção.
- [x] Girar o mapa em 37°, 90° e 359° com a projeção aberta, arrastar tokens e mapa, desenhar névoa e verificar a rotação após recarregar.

## Mapa de exemplo

`ruinas-do-musgo.png` foi criado com a ferramenta integrada de geração de imagens. Prompt usado:

> Create an original raster illustration for a tabletop fantasy RPG battle map, landscape 3:2. A true perpendicular orthographic bird’s-eye view, looking straight down onto an ancient roofless stone ruin in a dense evergreen forest. Center-left spacious weathered stone courtyard with a small circular ruined well near its center and broken perimeter walls. Open mossy dirt paths winding around the ruin and toward the bottom; lush pine and broadleaf canopies, muddy ground, mossy boulders, weathered rubble, with several traversable spaces for tokens. Soft golden sun from upper left dapples the forest floor, muted moss green and antique warm brown, rich hand-painted realistic texture with clear tabletop readability, art fills the frame edge to edge. No grid, typography, characters, borders, markers, UI, or labels. Avoid deep blacks or bright saturated colors. Entire image must be top down.

## Registro de mudanças

- 17/11/2026 — Definido o escopo inicial e criada a lista de etapas e testes.
- 17/11/2026 — Implementada a primeira versão local da mesa, com grade opcional e mapa de exemplo. Verificados o salvamento e a sincronização entre janelas no Chrome.
- 17/11/2026 — Adicionados retratos, cópias de monstros por cenário e etiquetas de profissão nas fichas. Verificada a leitura de dados do formato anterior.
- 17/11/2026 — Adicionados ajustes de tamanho, reposição de tokens na última posição e indicação de vida dos personagens na mesa e na projeção.
- 18/11/2026 — Adicionada névoa editável por cenário e sincronizada com a projeção.
- 18/11/2026 — Adicionado catálogo de itens com um baú inicial e colocação de objetos na mesa.
- 18/11/2026 — Adicionados zoom e deslocamento do mapa com enquadramento compartilhado entre mesa e projeção.
