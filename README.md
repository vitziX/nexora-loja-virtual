# NEXORA — Loja de tecnologia

Projeto acadêmico de SPA (Single Page Application) para a atividade de Sistemas Web II.

## Funcionalidades
- Página inicial com apresentação da loja.
- Catálogo de produtos consultado pela Fake Store API.
- Busca por nome, descrição ou categoria.
- Filtro por categoria e ordenação por preço/nome.
- Formulário com validação para cadastro de novos produtos.
- Atualização do catálogo sem recarregar a página.
- Persistência dos produtos cadastrados com `localStorage`.
- Navegação SPA entre Início, Produtos e Cadastro.
- Layout responsivo para computador e celular.
- **Página do produto** com descrição, preço, botão *Adicionar ao carrinho* e botão *Comprar agora*.
- **Carrinho** com quantidades, frete (grátis acima de R$ 200) e resumo.
- **Checkout simulado** (dados, entrega, cartão/Pix/boleto) com máscaras, validação e tela de pedido confirmado. Nenhum pagamento real é feito e o cartão não é salvo.
- **Login e cadastro de usuários** com banco local (`localStorage`); somente usuários conectados cadastram ou excluem produtos.

## Tecnologias
- HTML5
- CSS3
- JavaScript puro (sem frameworks)
- Fetch API e `async/await`
- Fake Store API: https://fakestoreapi.com/

## Como executar
1. Baixe ou clone o repositório.
2. Abra a pasta no VS Code.
3. Instale a extensão **Live Server**.
4. Clique com o botão direito em `index.html`.
5. Selecione **Open with Live Server**.

Também é possível executar com um servidor local equivalente. Abrir o arquivo diretamente (`file://`) pode causar limitações no `fetch` em alguns navegadores.

## Banco local
Contas, sessão, carrinho e pedidos ficam no `localStorage`. As senhas são guardadas como hash SHA-256 com salt. Por ser um projeto sem backend, isso serve apenas para demonstração e não substitui autenticação de servidor.

## Observação sobre preços
A API fornece preços de demonstração em dólares. O projeto aplica um fator fixo de 5,2 apenas para exibir valores ilustrativos em reais. Isso não é uma cotação cambial em tempo real.

## Persistência
Os produtos cadastrados pelo formulário ficam no `localStorage` do navegador utilizado. Não existe backend ou banco de dados, portanto os produtos não são compartilhados entre dispositivos.

## Publicação
O projeto pode ser publicado pelo GitHub Pages ou Netlify. Confirme que o site publicado carrega os produtos da API antes de entregar.

## Autor
João Victor de Souza
