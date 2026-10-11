# Astral Stock | Blox Fruits

Bot Discord para publicar automaticamente o stock de Blox Fruits, separar Stock Normal e Stock da Mirage, mencionar cargos por fruta, usar emojis da Application do Discord e mostrar preços em Beli.

## O que o bot faz

- Consulta o stock em uma fonte pública de Wiki, com uma segunda fonte automática de reserva.
- Verifica o stock após cada reset, com tentativas a cada minuto até detectar a nova rotação.
- Detecta Stock Normal e Stock da Mirage na mesma consulta.
- Publica Normal e Mirage em mensagens separadas.
- Normal: ciclo global de 4 horas.
- Mirage: ciclo global de 2 horas.
- Mostra contagem regressiva para o próximo reset.
- Mostra o horário do próximo reset em Brasília.
- Usa Components V2.
- Usa emoji personalizado de cada fruta.
- Permite configurar um cargo para cada fruta.
- Menciona os cargos configurados quando a fruta aparece.
- Mostra preço em Beli com o emoji personalizado.
- Tem preços de fallback salvos no código quando a API não envia o preço.
- Guarda histórico e assinaturas localmente.
- Evita publicar novamente o mesmo stock.
- Registra os slash commands automaticamente no servidor configurado.

## Comandos

### Consulta
- /stock
- /historico

A configuração e remoção dos cargos de frutas é feita pelo /painel → **Cargos de frutas**. O comando /suporte, os comandos administrativos individuais de cargos de frutas e o comando de teste visual de stock foram removidos.

### Administração
- /atualizar
- /configurar-emoji
- /configurar-titulo
- /listar-emojis
- /remover-emoji

Os comandos administrativos usam a permissão Gerenciar servidor.


## ASTRAL STORE: loja e pedidos por Pix

A loja foi adicionada em `sales.js` e usa `data/sales.json` para salvar produtos, carrinhos e pedidos. O arquivo de dados é criado automaticamente quando o bot executa.

### Configuração inicial

1. Use `/loja-configurar` para cadastrar a chave Pix, nome do titular, link HTTPS direto da imagem do QR Code (opcional) e canal privado de pedidos (opcional).
2. Use `/loja-staff` para autorizar um cargo a aprovar ou recusar pedidos. Administradores e quem tem Gerenciar servidor também podem administrar a loja.
3. Cadastre cada item com `/produto-adicionar`: nome, preço em reais, estoque, conteúdo/link de entrega e descrição opcional. Use estoque `-1` para ilimitado.
4. Use `/loja` para publicar a vitrine no canal desejado.
5. Use `/produto-listar` para consultar IDs e estoque, `/produto-remover` para tirar um produto da vitrine e `/pedido-pendentes` para revisar pagamentos.

### Fluxo de compra

- O cliente escolhe produtos, define quantidades, revisa o carrinho e cria um pedido.
- O pedido mostra o valor, a chave Pix em bloco de texto copiável e o QR Code configurado, se houver.
- O botão **Já paguei** apenas avisa a equipe. Não confirma o pagamento.
- A equipe deve conferir o recebimento real no aplicativo bancário antes de usar **Confirmar Pix e entregar**. Nunca aprove apenas com base em captura de tela.
- Após aprovação, o bot desconta o estoque e envia o conteúdo de entrega por mensagem direta. Se a DM falhar, o pedido fica marcado para entrega manual.
- Pedidos e carrinhos ficam salvos em disco. Faça backup de `data/sales.json` antes de mudanças de hospedagem.

**Importante:** esta é uma integração sem API de pagamentos. A chave Pix e o QR Code são estáticos, o bot não consegue detectar sozinho se o dinheiro caiu e não cria cobranças Pix dinâmicas. Confira o titular e o valor no banco antes de aprovar. Configure somente uma chave Pix que você tem autorização para usar e siga as regras do banco/provedor.

## Emojis da Application

O bot aceita:
- Emoji Unicode.
- Emoji personalizado do servidor.
- Emoji da Application criado no Discord Developer Portal.
- Nome do emoji da Application.

No /configurar-emoji, pode informar o nome do emoji ou o emoji completo, por exemplo:
<:nome:ID>
<a:nome:ID>

O código já usa:
- Blox Fruits: <:emoji_001:1539652915050971226>
- Beli: <:emoji_232:1556366446257242112>
- Relógio: <a:emoji_233:1556370328135925931>

## Configuração dos cargos de frutas

Use `/painel` → **Configuração** → **Cargos das frutas**. Selecione uma fruta e escolha o cargo no seletor de cargos; para retirar a associação, use **Remover cargo**. Não é necessário configurar as frutas por comandos separados.

O bot salva o ID do cargo, não o nome. Para mencionar cargos em alertas de stock, confira também as permissões de menção do cargo e do bot.

## Variáveis de ambiente

Crie um arquivo .env na hospedagem com:

DISCORD_TOKEN=TOKEN_DO_BOT
CLIENT_ID=ID_DA_APLICACAO
GUILD_ID=ID_DO_SERVIDOR
CHANNEL_ID=ID_DO_CANAL
WIKI_STOCK_URL=https://blox-fruits-wiki.com/wiki/stock/

WIKI_STOCK_URL é opcional. Se não for definida, o bot tenta a Wiki pública alternativa e depois a Fandom.

Nunca coloque DISCORD_TOKEN ou STOCK_API_KEY no GitHub.

## Discord Developer Portal

A aplicação precisa ter um Bot criado.

O convite do bot deve incluir:
- bot
- applications.commands

No canal de stock, o bot precisa conseguir:
- Ver canal
- Ver histórico de mensagens
- Enviar mensagens
- Usar comandos de aplicação

Os cargos que serão mencionados precisam permitir menção.

Para criar emojis da Application:
1. Abra a aplicação no Discord Developer Portal.
2. Abra a área de emojis da aplicação.
3. Crie os emojis.
4. Use os nomes/IDs gerados no bot.

## Fonte de stock

O bot consulta primeiro a fonte pública configurada em WIKI_STOCK_URL (quando definida), depois tenta https://blox-fruits-wiki.com/wiki/stock/ e usa a Fandom como última alternativa. Se uma fonte falhar, o bot tenta a próxima e registra o resultado nos logs. Nenhuma chave de API é necessária para essas páginas públicas.

## Estrutura de arquivos

- index.js: código principal.
- package.json: dependências e comando de inicialização.
- .env.example: modelo das variáveis secretas.
- config.example.json: modelo de configuração.
- config.json: configuração criada pelo bot em execução.
- data/state.json: histórico e assinaturas de stock criados em execução.
- discloud.config: configuração da Discloud.
- .gitignore: impede o envio de .env, config.json, data e node_modules.

## Discloud

Configuração atual:

NAME=Astral Stock
TYPE=bot
MAIN=index.js
RAM=100
VERSION=latest

A versão do Node precisa ser 20 ou superior.

Na Discloud, cadastre todas as variáveis do .env no painel da aplicação.

Não envie o arquivo .env para o GitHub.

## Instalação local

Requer Node.js 20+.

npm install
npm start

O package.json já usa:

node index.js

## Como verificar depois de colocar online

1. Confirme nos logs da hospedagem que o bot conectou sem erros.
2. Confira se os comandos globais foram registrados.
3. Abra `/painel` e entre em **Configuração** para conferir os canais, logs e cargos de frutas.
4. Configure os canais de boas-vindas, saída, logs e tickets em **Canais e logs**.
5. Configure a chave Pix e o canal de pedidos com `/loja-configurar`; cadastre um produto com `/produto-adicionar`.
6. Publique a vitrine com `/loja` em um canal de teste e faça um pedido de teste sem realizar pagamento real.
7. Use `/stock` para conferir o último stock salvo.
8. Confira a execução do workflow **Node.js syntax check** na aba Actions do GitHub antes do deploy.

## Proteções

- Token e API key ficam somente em variáveis de ambiente.
- O .gitignore bloqueia arquivos sensíveis.
- O bot não entra em loop rápido de API.
- O bot agenda Normal nos horários 00h, 04h, 08h, 12h, 16h e 20h UTC e Mirage nas horas ímpares UTC. Após cada reset, aguarda 1 minuto e tenta novamente a cada minuto até detectar a nova rotação.
- Um erro de API não encerra o processo.
- Um erro de interação não encerra o processo.
- Assinaturas impedem republicação do mesmo stock.
- Cargos inválidos são ignorados.
- O histórico é limitado por historyLimit.

## Observação importante sobre preços

Os preços em Beli são separados do valor de trade. O bot mostra o preço de compra em Beli. Se a API não enviar esse campo, ele usa o preço salvo em SAVED_BELI_PRICES no index.js.

## Atualização

Depois de alterar arquivos no GitHub, faça redeploy/restart da aplicação na Discloud e confira o log antes de testar os comandos.

## Configuração de servidor: boas-vindas, saída e logs

Use `/painel` → **Configuração** → **Canais e logs**, ou abra `/config-servidor`. O painel permite definir canais separados para boas-vindas, saída de membros, logs de membros, mensagens, moderação, alterações no servidor, tickets, anúncios e sugestões.

Os textos de boas-vindas e saída aceitam `{user}`, `{username}`, `{server}`, `{memberCount}` e `{id}`. Também é possível configurar uma imagem HTTPS, testar uma prévia e ligar/desligar as mensagens.

O módulo de tickets envia eventos de criação e fechamento ao canal de logs de tickets, se ele estiver configurado. As configurações do servidor ficam em `config.json`; os pedidos e carrinhos da loja ficam em `data/sales.json`. Esses dados locais não devem ser commitados no GitHub.
