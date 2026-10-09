# GuysMovies API

API REST do GuysMovies, uma rede social de filmes e séries onde cada pessoa
registra o que assistiu, monta a própria watchlist, avalia títulos, acompanha
temporada a temporada e marca com quem assistiu cada coisa.

Construída em NestJS com TypeORM e PostgreSQL, consumindo o catálogo do
[TMDB](https://www.themoviedb.org/). O frontend que consome esta API vive em
[guys-movies-frontend](https://github.com/AndreFreitasz/guys-movies-frontend).

| Ambiente  | URL                                             |
| --------- | ----------------------------------------------- |
| Produção  | https://guys-movies-backend.onrender.com        |
| Health    | https://guys-movies-backend.onrender.com/health |
| Aplicação | https://www.guysmovies.space                    |

## Sumário

- [Stack](#stack)
- [Funcionalidades](#funcionalidades)
- [Arquitetura](#arquitetura)
- [Pré-requisitos](#pré-requisitos)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Subindo com Docker](#subindo-com-docker)
- [Rodando sem Docker](#rodando-sem-docker)
- [Banco de dados e migrations](#banco-de-dados-e-migrations)
- [Testes](#testes)
- [Endpoints](#endpoints)
- [Segurança](#segurança)
- [Scripts disponíveis](#scripts-disponíveis)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Deploy](#deploy)
- [Solução de problemas](#solução-de-problemas)
- [Convenções de contribuição](#convenções-de-contribuição)
- [Licença](#licença)

## Stack

| Camada       | Tecnologia                                 |
| ------------ | ------------------------------------------ |
| Runtime      | Node.js 20                                 |
| Framework    | NestJS 11                                  |
| Linguagem    | TypeScript 5                               |
| Banco        | PostgreSQL 16 com TypeORM 0.3              |
| Autenticação | JWT em cookie httpOnly, hash com bcrypt    |
| Catálogo     | TMDB API v3 via axios                      |
| Imagens      | sharp                                      |
| Agendamento  | @nestjs/schedule                           |
| Proteções    | helmet, @nestjs/throttler, class-validator |
| Testes       | Jest e Supertest                           |
| Container    | Docker multi stage e Docker Compose        |

## Funcionalidades

- Cadastro e login com senha em bcrypt e sessão em cookie httpOnly.
- Catálogo de filmes e séries vindo do TMDB: populares, mais bem avaliados, por
  gênero e por serviço de streaming.
- Busca unificada de filmes, séries e pessoas com ordenação por relevância.
- Registro do que já foi assistido, com data, nota e onde foi assistido.
- Watchlist de filmes e séries, com checagem de disponibilidade.
- Séries acompanhadas temporada a temporada, somando o tempo assistido.
- Perfil público com avatar, capa, favoritos, estatísticas e linha do tempo.
- Seguir e deixar de seguir pessoas, com listas de seguidores e seguindo.
- Convites de "assisti com", aceitos ou recusados pela outra pessoa.
- Rota de health que consulta o banco e job opcional de keep alive.

## Arquitetura

```
Navegador
   |
   v
Next.js (guys-movies-frontend)
   |  fetch com cookie httpOnly
   v
NestJS (esta API)
   |                      \
   v                       v
PostgreSQL            TMDB API v3
(dados do usuário)    (catálogo)
```

Cada domínio é um módulo Nest isolado, com controller, service e entidades
próprias. O catálogo nunca é persistido inteiro: só os títulos que alguém marcou
como assistido ou colocou na watchlist viram linha no banco, o resto é buscado
no TMDB a cada requisição.

## Pré-requisitos

Para o caminho com Docker, que é o recomendado:

- [Docker](https://docs.docker.com/get-docker/) 24 ou superior, com o Docker
  Compose v2 embutido.
- Uma chave da API do TMDB, gratuita, criada em
  [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api).

Para rodar sem Docker, adicione Node.js 20.19 ou superior, npm 10.8 ou superior
e um PostgreSQL 16 acessível.

## Variáveis de ambiente

Copie o arquivo de exemplo e preencha o que faltar:

```bash
cp .env.example .env
```

| Variável              | Obrigatória | Padrão        | Descrição                                                           |
| --------------------- | ----------- | ------------- | ------------------------------------------------------------------- |
| `PORT`                | não         | `3005`        | Porta HTTP. Em produção a plataforma injeta sozinha.                |
| `NODE_ENV`            | não         | `development` | Em `production` o cookie de sessão vira `secure` e `sameSite=none`. |
| `DB_HOST`             | sim         |               | Host do Postgres. A aplicação falha no boot se faltar.              |
| `DB_PORT`             | não         | `5432`        | Porta do Postgres.                                                  |
| `DB_USERNAME`         | sim         |               | Usuário do banco.                                                   |
| `DB_PASSWORD`         | sim         |               | Senha do banco.                                                     |
| `DB_DATABASE`         | sim         |               | Nome do banco.                                                      |
| `DB_SSL`              | não         | `false`       | `true` em qualquer Postgres gerenciado.                             |
| `DB_SYNCHRONIZE`      | não         | `false`       | Deixe desligado, o schema vem das migrations.                       |
| `DB_MIGRATIONS_RUN`   | não         | `true`        | Roda as migrations pendentes no boot. Só `false` desliga.           |
| `JWT_SECRET`          | sim         |               | Segredo de assinatura do token.                                     |
| `JWT_EXPIRATION_TIME` | não         | `604800`      | Validade da sessão em segundos.                                     |
| `TMDB_API_KEY`        | sim         |               | Chave da API do TMDB. Sem ela o catálogo volta vazio.               |
| `CORS_ORIGINS`        | não         | fallback      | Origens liberadas, separadas por vírgula.                           |
| `KEEP_ALIVE_URL`      | não         | vazio         | Se preenchida, um job chama `<URL>/health` a cada 10 minutos.       |

Quando `CORS_ORIGINS` não está definida, a API cai na lista de fallback de
`src/main.ts`. Em produção a variável está configurada no painel do Render, e é
ela que vale: mexer só no fallback do código não libera origem nenhuma.

O `.env` nunca entra na imagem Docker, o `.dockerignore` barra o arquivo. Apenas
o `.env.example` é versionado.

## Subindo com Docker

O `docker-compose.yml` da raiz sobe dois serviços: um PostgreSQL 16 com volume
persistente e a API já compilada a partir do `Dockerfile` multi stage. A API só
inicia depois que o healthcheck do banco passa, e as migrations rodam sozinhas
no boot.

### Passo 1: clone o repositório

```bash
git clone https://github.com/AndreFreitasz/guys-movies-backend.git
cd guys-movies-backend
```

### Passo 2: crie o arquivo de ambiente

```bash
cp .env.example .env
```

Abra o `.env` e preencha `TMDB_API_KEY`. Os valores de banco que já vêm no
exemplo batem com os do Compose, então não precisa mudar mais nada para rodar
localmente. Troque o `JWT_SECRET` por qualquer string sua.

### Passo 3: suba a stack

```bash
docker compose up --build
```

A primeira execução baixa as imagens, instala as dependências e compila o
projeto, então leva alguns minutos. Nas próximas, o cache do Docker resolve em
segundos.

Para deixar rodando em segundo plano:

```bash
docker compose up --build -d
```

### Passo 4: confirme que subiu

```bash
curl http://localhost:3005/health
```

A resposta esperada é:

```json
{ "status": "ok", "database": "up" }
```

Para ver o estado dos containers:

```bash
docker compose ps
```

Os dois serviços devem aparecer como `healthy`.

### Passo 5: use a API

| Serviço  | Endereço              |
| -------- | --------------------- |
| API      | http://localhost:3005 |
| Postgres | localhost:5432        |

Teste uma rota pública do catálogo:

```bash
curl http://localhost:3005/movies/popular
```

Se vier uma lista vazia, a `TMDB_API_KEY` está errada ou em branco.

### Passo 6: pare quando terminar

```bash
docker compose down
```

Para apagar também o volume do banco e começar do zero:

```bash
docker compose down -v
```

### Comandos úteis do dia a dia

```bash
docker compose logs -f api            # acompanha os logs da API
docker compose logs -f db             # acompanha os logs do Postgres
docker compose restart api            # reinicia só a API
docker compose build --no-cache api   # rebuild limpo após mudar dependências
docker compose exec api sh            # abre um shell dentro da API
docker compose exec db psql -U postgres -d postgres
```

### Só o banco no Docker

Se preferir rodar o Nest na sua máquina, com hot reload, e deixar apenas o
Postgres em container, é o que o `start:dev` já faz:

```bash
npm install
npm run start:dev
```

O script sobe o serviço `db` do Compose e depois executa `nest start --watch` na
sua máquina. Nesse modo o `DB_HOST` do `.env` precisa ser `localhost`, que é o
valor do exemplo.

## Rodando sem Docker

Com um PostgreSQL 16 já disponível e as credenciais preenchidas no `.env`:

```bash
npm install
npm run build
npm start
```

Para desenvolvimento com recarga automática sem subir o Compose, use
`npx nest start --watch` em vez do `start:dev`.

## Banco de dados e migrations

O schema é controlado pelas migrations em `src/migrations`. Elas rodam sozinhas
no boot da aplicação, a menos que `DB_MIGRATIONS_RUN` esteja em `false`. Um
banco vazio é populado inteiro na primeira subida.

O `synchronize` do TypeORM fica desligado de propósito. Ele reescreve o schema a
partir das entidades e já causou divergência entre ambientes.

Comandos de migration, que usam o `src/data-source.ts`:

```bash
npm run migration:run                                  # aplica as pendentes
npm run migration:revert                               # desfaz a última
npm run migration:generate src/migrations/NomeDaMigration
```

Principais tabelas: usuários, avatares, favoritos, follows, convites de "assisti
com", filmes e séries salvos, filmes e séries assistidos, temporadas assistidas
e as duas listas de espera.

## Testes

```bash
npm test              # suíte unitária
npm run test:watch    # modo watch
npm run test:cov      # com relatório de cobertura
npm run test:e2e      # testes de ponta a ponta
```

A suíte unitária cobre as regras de negócio mais sensíveis: relevância da busca,
cálculo de temporadas assistidas, paginação por cursor, linha do tempo do
perfil, convites de "assisti com", avatar, health e keep alive.

Os testes rodam na sua máquina, não dentro do container. A imagem do
`Dockerfile` passa por `npm prune --omit=dev` no último estágio, então o Jest
não está instalado nela de propósito.

## Endpoints

As rotas marcadas como protegidas exigem o cookie `jwt`, emitido no login.

### Autenticação e conta

| Método | Rota            | Protegida | Descrição                        |
| ------ | --------------- | --------- | -------------------------------- |
| POST   | `/users`        | não       | Cria uma conta                   |
| POST   | `/auth/login`   | não       | Autentica e grava o cookie `jwt` |
| GET    | `/auth/profile` | sim       | Dados da sessão atual            |
| POST   | `/auth/logout`  | sim       | Limpa o cookie                   |

### Catálogo

| Método | Rota                               | Descrição                          |
| ------ | ---------------------------------- | ---------------------------------- |
| GET    | `/movies/popular`                  | Filmes populares                   |
| GET    | `/movies/popularByProviders`       | Populares por serviço de streaming |
| GET    | `/movies/popularByGenres/:genreId` | Populares por gênero               |
| GET    | `/movies/topRated`                 | Filmes mais bem avaliados          |
| GET    | `/movies/search`                   | Busca de filmes                    |
| GET    | `/movie/:idMovie`                  | Detalhe de um filme                |
| GET    | `/series/popular`                  | Séries populares                   |
| GET    | `/series/popularByProviders`       | Populares por serviço de streaming |
| GET    | `/series/popularByGenres/:genreId` | Populares por gênero               |
| GET    | `/series/topRated`                 | Séries mais bem avaliadas          |
| GET    | `/series/search`                   | Busca de séries                    |
| GET    | `/serie/:idSerie`                  | Detalhe de uma série               |
| GET    | `/search`                          | Busca unificada                    |

### Filmes assistidos e watchlist

| Método | Rota                                | Protegida | Descrição                    |
| ------ | ----------------------------------- | --------- | ---------------------------- |
| POST   | `/createdMovie`                     | sim       | Salva um filme vindo do TMDB |
| POST   | `/watchedMovie`                     | sim       | Marca como assistido         |
| GET    | `/watchedMovie/list`                | sim       | Lista os filmes assistidos   |
| GET    | `/watchedMovie/isWatched`           | sim       | Checa se já foi assistido    |
| PATCH  | `/watchedMovie/watchedAt`           | sim       | Ajusta a data                |
| POST   | `/watchedMovie/rate`                | sim       | Dá nota                      |
| GET    | `/watchedMovie/getRate`             | sim       | Lê a nota                    |
| PATCH  | `/watchedMovie/watchSource/:idTmdb` | sim       | Ajusta onde foi assistido    |
| POST   | `/waitingMovie`                     | sim       | Coloca na watchlist          |
| GET    | `/waitingMovie/isWaiting`           | sim       | Checa se está na watchlist   |

### Séries assistidas e watchlist

| Método | Rota                                | Protegida | Descrição                     |
| ------ | ----------------------------------- | --------- | ----------------------------- |
| POST   | `/createdSerie`                     | sim       | Salva uma série vinda do TMDB |
| POST   | `/watchedSerie`                     | sim       | Marca como assistida          |
| GET    | `/watchedSerie/list`                | sim       | Lista as séries assistidas    |
| GET    | `/watchedSerie/isWatched`           | sim       | Checa se já foi assistida     |
| PATCH  | `/watchedSerie/watchedAt`           | sim       | Ajusta a data                 |
| POST   | `/watchedSerie/rate`                | sim       | Dá nota                       |
| GET    | `/watchedSerie/getRate`             | sim       | Lê a nota                     |
| POST   | `/watchedSerie/season`              | sim       | Marca uma temporada           |
| DELETE | `/watchedSerie/season`              | sim       | Desmarca uma temporada        |
| POST   | `/watchedSerie/complete`            | sim       | Marca a série inteira         |
| PATCH  | `/watchedSerie/watchSource/:idTmdb` | sim       | Ajusta onde foi assistida     |
| POST   | `/waitingSerie`                     | sim       | Coloca na watchlist           |
| GET    | `/waitingSerie/isWaiting`           | sim       | Checa se está na watchlist    |

### Biblioteca da pessoa logada

| Método | Rota                          | Protegida | Descrição                       |
| ------ | ----------------------------- | --------- | ------------------------------- |
| GET    | `/me/library`                 | sim       | Tudo que já foi assistido       |
| GET    | `/me/watchlist`               | sim       | Watchlist unificada             |
| GET    | `/me/watchlist/availability`  | sim       | Onde cada item está disponível  |
| DELETE | `/me/watchlist/:type/:idTmdb` | sim       | Remove da watchlist             |
| GET    | `/me/stats`                   | sim       | Estatísticas de consumo         |
| GET    | `/me/covers`                  | sim       | Capas disponíveis para o perfil |

### Perfil, seguidores e "assisti com"

| Método | Rota                               | Protegida | Descrição                     |
| ------ | ---------------------------------- | --------- | ----------------------------- |
| GET    | `/profiles`                        | não       | Busca de pessoas              |
| GET    | `/profiles/:username`              | não       | Perfil público                |
| GET    | `/profiles/:username/followers`    | não       | Quem segue a pessoa           |
| GET    | `/profiles/:username/following`    | não       | Quem a pessoa segue           |
| GET    | `/profiles/:username/timeline`     | não       | Linha do tempo do perfil      |
| GET    | `/users/:username/avatar`          | não       | Imagem do avatar              |
| POST   | `/profiles/:username/follow`       | sim       | Seguir                        |
| DELETE | `/profiles/:username/follow`       | sim       | Deixar de seguir              |
| PATCH  | `/me/profile`                      | sim       | Edita nome e bio              |
| PUT    | `/me/profile/favorites`            | sim       | Define os títulos favoritos   |
| PATCH  | `/me/profile/cover`                | sim       | Troca a capa                  |
| POST   | `/me/avatar`                       | sim       | Envia um avatar               |
| DELETE | `/me/avatar`                       | sim       | Remove o avatar               |
| POST   | `/me/watch-together`               | sim       | Convida alguém para um título |
| GET    | `/me/watch-together/pending`       | sim       | Convites recebidos            |
| GET    | `/me/watch-together/pending/count` | sim       | Quantidade de convites        |
| POST   | `/me/watch-together/:id/accept`    | sim       | Aceita um convite             |
| POST   | `/me/watch-together/:id/reject`    | sim       | Recusa um convite             |
| DELETE | `/me/watch-together/:id`           | sim       | Cancela um convite            |

### Operação

| Método | Rota      | Descrição                                           |
| ------ | --------- | --------------------------------------------------- |
| GET    | `/health` | Responde `ok` só se o `SELECT 1` no banco funcionar |

## Segurança

- Senhas guardadas com bcrypt, nunca em texto puro.
- Sessão em cookie `httpOnly`, inacessível ao JavaScript da página. Em produção
  o cookie sai com `secure` e `sameSite=none`.
- `helmet` aplicando os cabeçalhos de proteção padrão.
- Rate limit global de 120 requisições por minuto pelo `ThrottlerGuard`, com
  limites mais apertados onde importa: 5 logins por minuto e 5 cadastros por
  hora. O `/health` fica de fora da contagem.
- `ValidationPipe` global com `whitelist` e `forbidNonWhitelisted`, então
  qualquer campo fora do DTO derruba a requisição.
- CORS restrito à lista de origens configurada.
- Nenhum segredo versionado: só o `.env.example` entra no Git, e o
  `.dockerignore` impede que qualquer `.env` vá parar na imagem.

## Scripts disponíveis

| Script                       | O que faz                                   |
| ---------------------------- | ------------------------------------------- |
| `npm run build`              | Compila para `dist`                         |
| `npm start`                  | Roda o build compilado                      |
| `npm run start:dev`          | Sobe o Postgres no Docker e o Nest em watch |
| `npm run start:debug`        | Watch com o inspector aberto                |
| `npm run start:prod`         | Compila e roda                              |
| `npm run services:up`        | Sobe só o Postgres do Compose               |
| `npm run services:stop`      | Para os containers                          |
| `npm run services:down`      | Derruba os containers                       |
| `npm test`                   | Testes unitários                            |
| `npm run test:cov`           | Testes com cobertura                        |
| `npm run test:e2e`           | Testes de ponta a ponta                     |
| `npm run lint`               | ESLint com correção automática              |
| `npm run lint:check`         | Confere a formatação com o Prettier         |
| `npm run lint:fix`           | Formata com o Prettier                      |
| `npm run migration:run`      | Aplica as migrations pendentes              |
| `npm run migration:revert`   | Desfaz a última migration                   |
| `npm run migration:generate` | Gera uma migration a partir das entidades   |

## Estrutura de pastas

```
src/
  app/            módulo raiz, configuração do TypeORM e dos guards globais
  auth/           login, logout, JWT, guard e decorator de usuário atual
  common/         utilitários compartilhados
  health/         rota de health e job de keep alive
  migrations/     histórico de schema do banco
  movie/          filme individual: salvar, assistir, avaliar, aguardar
  movies/         catálogo de filmes no TMDB
  profile/        perfil, avatar, capas, follows, timeline e "assisti com"
  search/         busca unificada e cálculo de relevância
  serie/          série individual, incluindo controle por temporada
  series/         catálogo de séries no TMDB
  user-library/   biblioteca e watchlist da pessoa logada
  users/          cadastro e entidades de usuário
test/             testes de ponta a ponta
Dockerfile          imagem de produção, multi stage
docker-compose.yml  Postgres e API para rodar local
```

## Deploy

A API roda no [Render](https://render.com), com deploy automático a cada commit
na `main`. A imagem é a mesma do `Dockerfile` deste repositório.

As variáveis de ambiente de produção vivem no painel do serviço, não no
repositório. Ao trocar o domínio do frontend, é obrigatório atualizar
`CORS_ORIGINS` lá, porque a variável tem precedência sobre o fallback do
`src/main.ts`.

O plano gratuito hiberna a instância depois de um tempo ocioso. Por isso existe
a `KEEP_ALIVE_URL`: quando preenchida, um job chama `/health` a cada 10 minutos
e mantém o serviço de pé.

## Solução de problemas

**`DB_HOST não está definida` no boot.** As variáveis não chegaram ao processo.
Com Docker, confira se o `.env` existe na raiz antes do `docker compose up`. Sem
Docker, confira se o `.env` está na raiz do projeto.

**`relation "..." already exists` ao subir.** O banco tem um schema antigo,
criado quando o projeto ainda usava `synchronize`, mas sem registro na tabela de
migrations. A saída mais simples em ambiente local é recriar o volume:

```bash
docker compose down -v && docker compose up --build
```

**O catálogo volta vazio.** A `TMDB_API_KEY` está ausente ou inválida. Gere uma
nova em [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) e
reinicie a API.

**O frontend recebe erro de CORS.** A origem dele não está em `CORS_ORIGINS`.
Adicione e reinicie. Em produção, a mudança tem que ser feita no painel do
Render.

**A porta 5432 já está em uso.** Você tem um Postgres local rodando. Pare o
serviço ou mude `DB_PORT` no `.env`, que o Compose usa como porta publicada.

**O login não persiste a sessão.** Verifique se o `NODE_ENV` está em
`development` no ambiente local. Em `production` o cookie sai como `secure` e
`sameSite=none`, o que o navegador recusa fora de HTTPS.

## Convenções de contribuição

- Branch a partir da `main`, no formato `feat/nome`, `fix/nome` ou `chore/nome`.
- Commits no padrão Conventional Commits, com a mensagem em português:
  `feat(health): consultar o banco com SELECT 1 na rota de health`.
- Código sem comentários e com todos os identificadores em inglês. Textos
  exibidos ao usuário final continuam em português.
- Rode `npm run lint:fix` e `npm test` antes de abrir o PR.
- Mudança de schema entra por migration, nunca por `synchronize`.

## Licença

Projeto pessoal, sem licença de uso aberta. Todos os direitos reservados a André
Freitas.
