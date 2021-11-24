![](https://storage.googleapis.com/golden-wind/experts-club/capa-github.svg)

# Backend for frontend

Nessa aula vamos aprender sobre um padrão de arquitetura para conectar aplicações clientes - e.g. UIs - ao backend formado por microservices:
Backend for frontend - BFF.

Utilizaremos um exemplo com: 
- microservices construídos em Node.JS expondo APIs REST 
- BFFs construídos em Node.JS expondo APIs GraphQL
- infraestrutura _deployada_ localmente utilizando `Docker` e `docker-compose`

## Exemplo

![](/.github/assets/topology.png)

Neste exemplo, teremos um sistema de e-commerce **EXTREMAMENTE SIMPLIFICADO** com a seguinte arquitetura:

- Domain services:
  - user identity service
    - responsável por gestão e autenticação de usuários
    - `POST /login`: autentica o usuário, gerando um JWT
    - `POST /validate`: valida a autenticidade de um token
  - buyer service
    - responsável por gestão de informações pessoais de um usuário comprador
    - `GET /buyers/:id/profile`: retorna dados pessoais do usuário
    - `GET /buyers/:id/address`: retorna o endereço do usuário
  - product catalog service
    - responsável por gestão de catálogo de produtos vendidos pela plataforma
    - `GET /products`: listagem paginada de produtos
    - `GET /products/:id`: detalhes de um produto
    - `PUT /products/:id`: edição de dados de um produto
  - order service
    - responsável por gestão de pedidos de compra de produto
    - `POST /orders`: cria um novo pedido
    - `PUT /orders/:id/status/:status`: altera o status do pedido
    - `GET /orders`: listagem paginada de pedidos
    - `GET /orders?buyer=:buyerId`: listagem paginada de pedidos de um usuário comprador
- BFFS:
  - buyer mobile bff:
    - API pública a ser usada pelo app cliente mobile do usuário comprador
  - backoffice web bff:
    - API pública a ser usada pelo cliente web de backoffice do usuário administrador

### Comandos

Iniciar a aplicação
```sh
make start
```

Derrubar a aplicação
```sh
make stop
```

Status dos containers
```sh
make status
```

### Usando

Os BFFs `backoffice web bff` e `buyer mobile bff` ficam expostos em http://localhost:4000 e http://localhost:4001 respectivamente.

Recomendo navegar para essas URLs e explorar as APIs utilizando o Apollo Studio - que será ativado automaticamente ao se navegar para essas URLs.

As queries e mutations são todas autenticadas - exceto pelas mutations de login - logo é necessário antes de tudo se autenticar na aplicação - através das mutations `login`.

Os usuários - credenciais hardcoded no código do `user-identity-service` - são:
- buyer:
  - username: dowhile2021
  - password: password123
- admin:
  - username: theadmin
  - password: strongpassword

## Referências

- https://samnewman.io/patterns/architectural/bff/
- https://docs.microsoft.com/en-us/azure/architecture/patterns/backends-for-frontends
- https://docs.microsoft.com/en-us/dotnet/architecture/microservices/architect-microservice-container-applications/direct-client-to-microservice-communication-versus-the-api-gateway-pattern
- https://docs.microsoft.com/en-us/dotnet/architecture/microservices/architect-microservice-container-applications/microservices-architecture
- https://www.manuelkruisz.com/blog/posts/api-gateway-vs-bff
- https://philcalcado.com/2015/09/18/the_back_end_for_front_end_pattern_bff.html
- https://www.youtube.com/watch?v=rXi5CLjIQ9k
- https://michaeldfti.medium.com/diferen%C3%A7a-entre-api-gateway-e-backends-for-frontends-cb443821ff6d
- https://philcalcado.com/2015/09/18/the_back_end_for_front_end_pattern_bff.html

## Expert

| [<img src="https://avatars.githubusercontent.com/u/5365992?v=4" width="75px">](https://github.com/rodrigobotti) |
| :-: |
| [Rodrigo Botti](https://github.com/rodrigobotti) |
