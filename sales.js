"use strict";
const fs=require("node:fs"),path=require("node:path");
const {SlashCommandBuilder,PermissionFlagsBits,EmbedBuilder,ActionRowBuilder,ButtonBuilder,ButtonStyle,StringSelectMenuBuilder,ModalBuilder,TextInputBuilder,TextInputStyle,ChannelType}=require("discord.js");
const FILE=path.join(__dirname,"data","sales.json");
function read(){try{return Object.assign({guilds:{},carts:{},orders:{},nextOrder:1001},JSON.parse(fs.readFileSync(FILE,"utf8")))}catch{return {guilds:{},carts:{},orders:{},nextOrder:1001}}}
function save(d){fs.mkdirSync(path.dirname(FILE),{recursive:true});fs.writeFileSync(FILE+".tmp",JSON.stringify(d,null,2));fs.renameSync(FILE+".tmp",FILE)}
function cfg(d,g){return d.guilds[g]||(d.guilds[g]={pixKey:"",pixName:"",qrUrl:"",orderChannelId:"",staffRoles:[],products:[]})}
function ps(c){return Array.isArray(c.products)?c.products:(c.products=[])}
function cash(n){return Number(n).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
function embed(t,s){return new EmbedBuilder().setColor(0x5865F2).setTitle(t).setDescription(s).setFooter({text:"ASTRAL STORE • Pix conferido manualmente"}).setTimestamp()}
function staff(i,c){return i.user.id===i.guild?.ownerId||i.memberPermissions?.has(PermissionFlagsBits.Administrator)||i.memberPermissions?.has(PermissionFlagsBits.ManageGuild)||Boolean(i.member?.roles?.cache&&(c.staffRoles||[]).some(id=>i.member.roles.cache.has(id)))}
function key(g,u){return g+":"+u}
function cart(d,g,u){return d.carts[key(g,u)]||(d.carts[key(g,u)]=[])}
function total(a,p){return a.reduce((n,x)=>{const q=p.find(y=>y.id===x.id);return n+(q?q.price*x.qty:0)},0)}
async function reply(i,p){if(i.deferred||i.replied)return i.followUp(Object.assign({ephemeral:true},p));return i.reply(Object.assign({ephemeral:true},p))}
function orderEmbed(o,s){return embed("Pedido #"+o.id+" • "+(s||o.status.toUpperCase()),"Cliente: <@"+o.userId+">\n"+o.items.map(x=>"- "+x.name+" × "+x.qty+" | "+cash(x.price*x.qty)).join("\n")+"\n\nTotal: "+cash(o.total)+"\nStatus: "+(s||o.status)+"\nCriado: <t:"+Math.floor(o.createdAt/1000)+":F>")}
function adminRows(id){return [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("sales:approve:"+id).setLabel("Confirmar Pix e entregar").setEmoji("<:user_check:1557205120335224933>").setStyle(ButtonStyle.Success),new ButtonBuilder().setCustomId("sales:reject:"+id).setLabel("Recusar pagamento").setEmoji("<:offline:1557204568432185454>").setStyle(ButtonStyle.Danger))]}
async function notify(i,client,c,o){let ch=c.orderChannelId?await client.channels.fetch(c.orderChannelId).catch(()=>null):null;if(!ch?.isTextBased?.())ch=i.channel;if(ch?.isTextBased?.())await ch.send({content:"Novo pedido #"+o.id+" aguardando conferência • <@"+o.userId+">",embeds:[orderEmbed(o,"PAGAMENTO PENDENTE")],components:adminRows(o.id),allowedMentions:{users:[o.userId]}})}
const commands=[
new SlashCommandBuilder().setName("loja").setDescription("Publicar a vitrine da ASTRAL STORE"),
new SlashCommandBuilder().setName("loja-configurar").setDescription("Configurar Pix e canal de pedidos").setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild).addStringOption(o=>o.setName("chave_pix").setDescription("Chave Pix para copiar").setRequired(true).setMaxLength(200)).addStringOption(o=>o.setName("titular").setDescription("Nome do titular").setRequired(true).setMaxLength(100)).addStringOption(o=>o.setName("qr_url").setDescription("URL HTTPS direta da imagem do QR Code").setMaxLength(500)).addChannelOption(o=>o.setName("canal_pedidos").setDescription("Canal privado para a equipe").addChannelTypes(ChannelType.GuildText)),
new SlashCommandBuilder().setName("produto-adicionar").setDescription("Cadastrar produto digital").setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild).addStringOption(o=>o.setName("nome").setDescription("Nome do produto").setRequired(true).setMaxLength(80)).addNumberOption(o=>o.setName("preco").setDescription("Preço em reais").setRequired(true).setMinValue(0.01).setMaxValue(100000)).addIntegerOption(o=>o.setName("estoque").setDescription("Use -1 para estoque ilimitado").setRequired(true).setMinValue(-1).setMaxValue(1000000)).addStringOption(o=>o.setName("entrega").setDescription("Código, texto ou link entregue por DM após aprovação").setRequired(true).setMaxLength(1800)).addStringOption(o=>o.setName("descricao").setDescription("Descrição do produto").setMaxLength(250)),
new SlashCommandBuilder().setName("produto-remover").setDescription("Remover produto da vitrine").setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild).addStringOption(o=>o.setName("produto_id").setDescription("ID do produto em produto-listar").setRequired(true).setMaxLength(40)),
new SlashCommandBuilder().setName("produto-listar").setDescription("Listar produtos e estoque").setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
new SlashCommandBuilder().setName("pedido-pendentes").setDescription("Ver pedidos aguardando conferência").setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
new SlashCommandBuilder().setName("loja-staff").setDescription("Autorizar cargo a aprovar pagamentos").setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild).addRoleOption(o=>o.setName("cargo").setDescription("Cargo autorizado").setRequired(true)).addStringOption(o=>o.setName("acao").setDescription("Adicionar ou remover").setRequired(true).addChoices({name:"Adicionar",value:"add"},{name:"Remover",value:"remove"}))
];
async function handleInteraction(i,client){
 const n=i.isChatInputCommand()?i.commandName:"",id=i.customId||"";
 if(!commands.some(x=>x.name===n)&&!id.startsWith("sales:"))return false;
 if(!i.guildId){await reply(i,{content:"A loja só funciona dentro de um servidor."});return true}
 const d=read(),c=cfg(d,i.guildId),p=ps(c);
 try{
 if(n==="loja"){
 const avail=p.filter(x=>x.active!==false&&(x.stock<0||x.stock>0));
 const desc=avail.slice(0,20).map(x=>"**"+x.name+"** • "+cash(x.price)+"\n"+(x.description||"Produto digital")+"\nEstoque: "+(x.stock<0?"Ilimitado":x.stock)).join("\n\n");
 const e=embed("🛍️ ASTRAL STORE","Escolha um produto, adicione ao carrinho e pague com Pix.\n\n"+(desc||"Nenhum produto disponível."));
 if(c.qrUrl&&c.qrUrl.startsWith("https://"))e.setThumbnail(c.qrUrl);
 const rows=[];if(avail.length)rows.push(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId("sales:choose").setPlaceholder("Escolha um produto").addOptions(avail.slice(0,25).map(x=>({label:x.name.slice(0,100),description:(cash(x.price)+" • estoque "+(x.stock<0?"ilimitado":x.stock)).slice(0,100),value:x.id})))));
 rows.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("sales:cart").setLabel("Meu carrinho").setEmoji("<:clipboard:1557204790843412542>").setStyle(ButtonStyle.Primary),new ButtonBuilder().setCustomId("sales:orders").setLabel("Meus pedidos").setEmoji("<:file:1557204826280951858>").setStyle(ButtonStyle.Secondary)));
 await i.reply({embeds:[e],components:rows,ephemeral:false});save(d);return true}
 if(n==="loja-configurar"){
 if(!staff(i,c)){await reply(i,{content:"Você não pode configurar a loja."});return true}
 const qr=i.options.getString("qr_url")||"";if(qr&&!/^https:\/\/\S+$/i.test(qr)){await reply(i,{content:"A URL do QR precisa começar com https://."});return true}
 c.pixKey=i.options.getString("chave_pix").trim();c.pixName=i.options.getString("titular").trim();c.qrUrl=qr;c.orderChannelId=i.options.getChannel("canal_pedidos")?.id||c.orderChannelId||"";save(d);
 await reply(i,{content:"Pix configurado.\nChave: "+c.pixKey+"\nTitular: "+c.pixName+"\nCanal de pedidos: "+(c.orderChannelId?"<#"+c.orderChannelId+">":"canal atual")+"\n"+(qr?"QR Code configurado.":"A chave Pix copia e cola estará disponível.")});return true}
 if(n==="produto-adicionar"){
 if(!staff(i,c)){await reply(i,{content:"Você não pode cadastrar produtos."});return true}if(p.length>=100){await reply(i,{content:"Limite de 100 produtos atingido."});return true}
 const x={id:"P"+Date.now().toString(36).toUpperCase(),name:i.options.getString("nome").trim(),price:Math.round(i.options.getNumber("preco")*100)/100,stock:i.options.getInteger("estoque"),delivery:i.options.getString("entrega").trim(),description:i.options.getString("descricao")||"Produto digital",active:true};p.push(x);save(d);await reply(i,{content:"Produto cadastrado: **"+x.name+"** • "+cash(x.price)+"\nID: "+x.id+"\nEstoque: "+(x.stock<0?"ilimitado":x.stock)});return true}
 if(n==="produto-remover"){
 if(!staff(i,c)){await reply(i,{content:"Você não pode remover produtos."});return true}const x=p.find(y=>y.id.toLowerCase()===i.options.getString("produto_id").toLowerCase());if(!x){await reply(i,{content:"ID não encontrado. Use produto-listar."});return true}x.active=false;save(d);await reply(i,{content:"Produto removido da vitrine: "+x.name});return true}
 if(n==="produto-listar"){
 if(!staff(i,c)){await reply(i,{content:"Sem permissão."});return true}await reply(i,{embeds:[embed("Produtos cadastrados",p.map(x=>"**"+x.name+"** • "+cash(x.price)+" • estoque "+(x.stock<0?"∞":x.stock)+" • "+(x.active===false?"inativo":"ativo")+"\nID: "+x.id).join("\n\n")||"Nenhum produto.") ]});return true}
 if(n==="pedido-pendentes"){
 if(!staff(i,c)){await reply(i,{content:"Sem permissão."});return true}const os=Object.values(d.orders).filter(x=>x.guildId===i.guildId&&x.status==="pending").sort((a,b)=>a.createdAt-b.createdAt).slice(0,5);if(!os.length){await reply(i,{content:"Nenhum pedido pendente."});return true}await reply(i,{embeds:os.map(x=>orderEmbed(x,"PAGAMENTO PENDENTE")),components:os.map(x=>adminRows(x.id)[0])});return true}
 if(n==="loja-staff"){
 if(!staff(i,c)){await reply(i,{content:"Somente administradores podem alterar a equipe."});return true}const r=i.options.getRole("cargo"),a=i.options.getString("acao");c.staffRoles=Array.isArray(c.staffRoles)?c.staffRoles:[];if(a==="add"&&!c.staffRoles.includes(r.id))c.staffRoles.push(r.id);if(a==="remove")c.staffRoles=c.staffRoles.filter(x=>x!==r.id);save(d);await reply(i,{content:"Cargo "+r+" "+(a==="add"?"autorizado":"removido")+" na loja."});return true}
 if(id==="sales:choose"&&i.isStringSelectMenu()){
 const x=p.find(y=>y.id===i.values[0]&&y.active!==false);if(!x||x.stock===0){await reply(i,{content:"Produto indisponível."});return true}
 const m=new ModalBuilder().setCustomId("sales:qty:"+x.id).setTitle("Adicionar ao carrinho").addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("qty").setLabel("Quantidade").setPlaceholder("1").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(4)));await i.showModal(m);return true}
 if(i.isModalSubmit()&&id.startsWith("sales:qty:")){
 const x=p.find(y=>y.id===id.slice(10)&&y.active!==false),q=Number(i.fields.getTextInputValue("qty"));if(!x||!Number.isInteger(q)||q<1||q>100||(x.stock>=0&&x.stock<q)){await reply(i,{content:"Quantidade inválida ou estoque insuficiente."});return true}
 const a=cart(d,i.guildId,i.user.id),old=a.find(y=>y.id===x.id);if(old){if(x.stock>=0&&old.qty+q>x.stock){await reply(i,{content:"Quantidade ultrapassa o estoque."});return true}old.qty+=q}else a.push({id:x.id,qty:q});save(d);await reply(i,{content:"Adicionado: "+x.name+" × "+q+" • subtotal "+cash(x.price*q),components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("sales:cart").setLabel("Ver carrinho").setStyle(ButtonStyle.Primary),new ButtonBuilder().setCustomId("sales:checkout").setLabel("Finalizar pedido").setStyle(ButtonStyle.Success))]});return true}
 if(id==="sales:cart"){
 const a=cart(d,i.guildId,i.user.id),lines=a.map(y=>{const x=p.find(z=>z.id===y.id);return x?"• "+x.name+" × "+y.qty+" = "+cash(x.price*y.qty):""}).filter(Boolean),rows=[];
 if(a.length)rows.push(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId("sales:remove").setPlaceholder("Remover produto").addOptions(a.slice(0,25).map(y=>{const x=p.find(z=>z.id===y.id);return {label:(x?x.name:y.id).slice(0,100),value:y.id}}))));
 rows.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("sales:checkout").setLabel("Finalizar pedido").setEmoji("<:money_symbol_alt:1557204522009370634>").setStyle(ButtonStyle.Success).setDisabled(!a.length),new ButtonBuilder().setCustomId("sales:clear").setLabel("Esvaziar").setStyle(ButtonStyle.Secondary).setDisabled(!a.length)));
 await reply(i,{embeds:[embed(a.length?"Seu carrinho":"Carrinho vazio",lines.join("\n")+(a.length?"\n\nTotal: "+cash(total(a,p)):"Abra /loja para escolher produtos."))],components:rows});return true}
 if(id==="sales:remove"&&i.isStringSelectMenu()){d.carts[key(i.guildId,i.user.id)]=cart(d,i.guildId,i.user.id).filter(x=>x.id!==i.values[0]);save(d);await reply(i,{content:"Produto removido. Abra Meu carrinho para conferir."});return true}
 if(id==="sales:clear"){d.carts[key(i.guildId,i.user.id)]=[];save(d);await reply(i,{content:"Carrinho esvaziado."});return true}
 if(id==="sales:checkout"){
 if(!c.pixKey){await reply(i,{content:"A loja ainda não configurou o Pix."});return true}const a=cart(d,i.guildId,i.user.id);if(!a.length){await reply(i,{content:"Carrinho vazio."});return true}
 const items=[];for(const y of a){const x=p.find(z=>z.id===y.id&&z.active!==false);if(!x||(x.stock>=0&&x.stock<y.qty)){await reply(i,{content:"Produto indisponível ou estoque insuficiente. Revise o carrinho."});return true}items.push({id:x.id,name:x.name,price:x.price,qty:y.qty,delivery:x.delivery})}
 const oid=String(d.nextOrder++),sum=items.reduce((n,x)=>n+x.price*x.qty,0),o={id:oid,guildId:i.guildId,userId:i.user.id,items,total:sum,status:"pending",createdAt:Date.now(),reviewedBy:null};d.orders[oid]=o;d.carts[key(i.guildId,i.user.id)]=[];save(d);
 const e=embed("Pedido #"+oid+" criado","Itens:\n"+items.map(x=>"- "+x.name+" × "+x.qty).join("\n")+"\n\nValor exato: **"+cash(sum)+"**\nChave Pix copia e cola:\n"+String.fromCharCode(96,96,96)+"\n"+c.pixKey+"\n"+String.fromCharCode(96,96,96)+"\nTitular: "+(c.pixName||"Confira no banco")+"\n\nCopie a chave acima, pague no banco e toque em Já paguei. A equipe só libera após confirmar o recebimento real. Confira o titular antes de pagar.");
 if(c.qrUrl&&c.qrUrl.startsWith("https://"))e.setImage(c.qrUrl);
 await reply(i,{embeds:[e],components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("sales:paid:"+oid).setLabel("Já paguei").setEmoji("<:smoke:1556626973558710342>").setStyle(ButtonStyle.Success))]});await notify(i,client,c,o).catch(console.error);return true}
 if(id==="sales:orders"){const os=Object.values(d.orders).filter(x=>x.guildId===i.guildId&&x.userId===i.user.id).sort((a,b)=>b.createdAt-a.createdAt).slice(0,5);await reply(i,{embeds:os.length?os.map(x=>orderEmbed(x,x.status.toUpperCase())):[embed("Meus pedidos","Você ainda não tem pedidos.")]});return true}
 if(id.startsWith("sales:paid:")){const oid=id.split(":")[2],o=d.orders[oid];if(!o||o.guildId!==i.guildId||o.userId!==i.user.id){await reply(i,{content:"Pedido não encontrado."});return true}if(o.status!=="pending"){await reply(i,{content:"Status atual: "+o.status});return true}o.customerMarkedPaidAt=Date.now();save(d);await reply(i,{content:"Equipe avisada sobre o pedido #"+oid+". A entrega depende da conferência do Pix no banco."});await notify(i,client,c,o).catch(console.error);return true}
 if(id.startsWith("sales:approve:")||id.startsWith("sales:reject:")){
 if(!staff(i,c)){await reply(i,{content:"Apenas equipe autorizada pode revisar pagamentos."});return true}const yes=id.startsWith("sales:approve:"),oid=id.split(":")[2],o=d.orders[oid];if(!o||o.guildId!==i.guildId){await reply(i,{content:"Pedido não encontrado."});return true}if(o.status!=="pending"){await reply(i,{content:"Pedido já processado: "+o.status});return true}
 if(!yes){o.status="rejected";o.reviewedBy=i.user.id;o.reviewedAt=Date.now();save(d);await i.update({embeds:[orderEmbed(o,"PAGAMENTO RECUSADO")],components:[]});const u=await client.users.fetch(o.userId).catch(()=>null);if(u)await u.send("O Pix do pedido #"+oid+" não foi confirmado. Fale com a equipe se houve engano.").catch(()=>{});return true}
 for(const y of o.items){const x=p.find(z=>z.id===y.id);if(x&&x.stock>=0&&x.stock<y.qty){await reply(i,{content:"Estoque insuficiente para "+x.name+". Ajuste antes de aprovar."});return true}}
 o.status="approved";o.reviewedBy=i.user.id;o.reviewedAt=Date.now();for(const y of o.items){const x=p.find(z=>z.id===y.id);if(x&&x.stock>=0)x.stock-=y.qty}save(d);
 const u=await client.users.fetch(o.userId).catch(()=>null);let ok=false;if(u)ok=await u.send({embeds:[embed("Pagamento confirmado • Pedido #"+oid,"Pagamento aprovado.\n\n"+o.items.map(x=>"**"+x.name+" × "+x.qty+"**\n"+x.delivery).join("\n\n"))]}).then(()=>true).catch(()=>false);
 o.status=ok?"delivered":"approved_delivery_failed";save(d);await i.update({embeds:[orderEmbed(o,ok?"PAGO E ENTREGUE":"PAGO • FALHA NA DM")],components:[]});if(!ok)await i.followUp({content:"Pagamento aprovado, mas a DM falhou. Entregue manualmente a <@"+o.userId+">.",ephemeral:true}).catch(()=>{});return true}
 return false
 }catch(e){console.error("[SALES]",e);await reply(i,{content:"Não consegui concluir a ação: "+String(e.message||"erro").slice(0,250)}).catch(()=>{});return true}
}
module.exports={commands,handleInteraction};
