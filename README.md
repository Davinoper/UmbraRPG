# Umbra

Umbra é uma mesa virtual para RPG presencial. O mestre prepara fichas e cenários no navegador e abre uma segunda janela para mostrar o mapa aos jogadores em um monitor ou projetor.

## Abrir o Umbra

1. Se recebeu o projeto em um ZIP, extraia a pasta inteira.
2. Abra [`index.html`](index.html) no Chrome. Mantenha o HTML, o CSS, o JavaScript e o mapa de exemplo na mesma pasta.
3. Use **Ruínas do Musgo** e os personagens de exemplo para testar a mesa.

O projeto usa HTML, CSS e JavaScript e funciona diretamente no navegador, inclusive offline.

## Preparar a sessão

| Aba | O que fazer |
| --- | --- |
| **Personagens** | Clique em **Novo personagem** e preencha a ficha. Você pode definir nome, classe, vida atual e máxima, cor do token, atributos, anotações e retrato. |
| **Profissões** | Clique em **Nova profissão** para criar uma etiqueta. Abra a ficha do personagem e marque as profissões que deseja exibir no cartão. |
| **Cenários** | Clique em **Novo cenário**, escolha uma imagem do computador e preencha o texto de abertura e as anotações do mestre. Clique em **Usar na mesa** para ativar o cenário. |
| **Monstros** | Clique em **Novo monstro** para cadastrar uma criatura com nome, vida máxima, cor e retrato opcional. Use **Colocar na mesa** para adicionar uma cópia numerada ao cenário ativo. |
| **Itens** | A aba começa com um **Baú**. Use **Novo item** para cadastrar outros objetos com imagem opcional e anotações. Clique em **Colocar na mesa** para adicionar uma cópia ao cenário ativo. |

## Usar a mesa durante o jogo

- **Adicionar tokens.** Em **Mesa → Tokens na mesa**, escolha o personagem, monstro ou item no seletor correspondente e clique no **+** ao lado. Cada cópia de monstro ou item pode ser movida separadamente.
- **Mover tokens.** Arraste o token pelo mapa. Com um token em foco, você também pode usar as setas do teclado.
- **Ajustar o tamanho.** Em **Tamanho dos tokens**, escolha **Todos os tokens** ou selecione um token específico. Use **−** e **+**. O ajuste individual é relativo ao tamanho geral do cenário.
- **Retirar e recolocar.** Clique em **×** ao lado do token. Depois, abra **Tokens retirados** e clique em **Recolocar** para voltar à última posição. Os demais tokens ficam onde estavam.
- **Atualizar a vida.** Abra **Personagens → Editar ficha**, altere a vida e salve. A vida atual e máxima aparecem acima dos tokens dos personagens.
- **Rolar dados.** Clique em **d6** ou **d20** no painel **Dados**. O resultado aparece abaixo dos botões.

### Retratos e GIFs

Na ficha do personagem, escolha a imagem em **Retrato original do personagem**. Em **Animações do token → Adicionar GIFs**, selecione um ou mais arquivos e salve a ficha. Na mesa, clique no token do personagem e escolha a animação ou **Voltar ao retrato original**. A escolha fica salva por cenário e aparece na projeção.

Retratos em GIF também animam nos tokens de monstros. Personagens e monstros sem retrato usam iniciais.

### Enquadrar o mapa

| Controle | Como usar |
| --- | --- |
| **Grade** | Mostra ou esconde a grade na mesa e na projeção. |
| **Zoom** | Use **−** e **+** acima do mapa para ajustar a ampliação de 100% a 600%. |
| **Mover mapa** | Com o mapa ampliado, ative o modo e arraste o cenário para enquadrar a região desejada. Clique no botão novamente para voltar a mover tokens. |
| **Rotação** | Gire o mapa de 0° a 359°. As posições dos tokens e a névoa acompanham o terreno, enquanto os retratos e indicadores de vida permanecem na vertical. |
| **Mapa inteiro** | Volta à visão geral e mantém a rotação escolhida. |

### Cobrir e revelar áreas

1. Clique em **Névoa → Cobrir** e arraste sobre a área que deseja esconder.
2. Ao soltar, a área fica sombreada para o mestre e opaca na projeção. Um token some da projeção quando seu centro entra na área coberta.
3. Use **Revelar** e arraste sobre a parte que deseja mostrar. Clique em **Névoa** novamente para voltar a mover tokens.

## Projetar para os jogadores

1. Na aba **Mesa**, clique em **Abrir projeção**. Se o navegador bloquear a janela, permita o pop-up e tente novamente.
2. Arraste a janela de projeção para o segundo monitor ou projetor e clique em **Tela cheia**.
3. Conduza a sessão no painel principal. A projeção acompanha a troca de cenário, os movimentos dos tokens, o enquadramento e a névoa. O texto de abertura e as anotações ficam no painel do mestre.

Se recarregar o painel, clique novamente em **Abrir projeção** para sincronizar a janela.

## Dados salvos e compartilhamento

O Umbra salva fichas, catálogos, mapas importados e estado da mesa no navegador. Para continuar a campanha, use o mesmo navegador, perfil e endereço. Ao mover ou reenviar a pasta, você compartilha o aplicativo e o cenário de exemplo. A campanha fica no navegador em que foi criada.

Você também pode servir os arquivos com um servidor estático. Para testar no próprio computador, com Python instalado, abra um terminal na pasta e execute:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Abra [http://127.0.0.1:8000/](http://127.0.0.1:8000/). O endereço do servidor e o arquivo aberto diretamente têm armazenamentos separados. Em um servidor compartilhado, cada navegador mantém seus próprios dados. A projeção é sincronizada com a janela do mestre no mesmo navegador.

## Desenvolvimento e licença

O [plano de implementação](PLANO_IMPLEMENTACAO.md) registra as etapas e os testes. O projeto usa a [licença MIT](LICENSE).
