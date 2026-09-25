# Games Educativos — implantação própria 23.0

Esta branch é exclusiva da aplicação Node.js/SQLite. A branch `main`, o portfólio GitHub Pages e os Sites originais não são alterados.

## Fontes e verificação

O diretório `release` contém o pacote incremental Brotli da versão 23, dividido em cinco partes binárias para transporte. `tools/unpack.mjs` verifica SHA-256 do pacote, da base e de cada fonte, e escreve os 22 arquivos completos. Não executa código do pacote durante a reconstrução.

Para obter os arquivos editáveis:

```sh
node tools/unpack.mjs ./missao-circular ./aplicativo
cd aplicativo
```

O Dockerfile executa a mesma reconstrução. A imagem final contém `server`, `public`, `scripts` e `package.json`, sem o portfólio nem dados pessoais de teste. A base `missao-circular` é fixada pelo checksum; não a altere sem regenerar o pacote. O ZIP entregue na conversa também contém os fontes completos.

## Produção

- Node.js 24; uma réplica.
- Volume persistente montado em `/app/private`; nunca coloque o SQLite em armazenamento descartável.
- `PUBLIC_ORIGIN`: domínio HTTPS da aplicação.
- `ADMIN_BOOTSTRAP_JSON`: login e hash scrypt configurados somente como variável privada do serviço, nunca neste repositório.
- `TRUST_PROXY=1`: somente na implantação atrás do proxy Railway.
- `FORUM_FRAME_ANCESTORS`: origens HTTPS permitidas para incorporar o jogo.
- A aplicação abandona privilégios de root antes de atender requisições.
- Healthcheck: `/api/mediacao/health`.

Rotas: `/gameseducativos/` para o jogo e `/mediadora/` para o painel. A aba Jogos do painel fornece o link de participação com a chave de convite e o iframe correspondente. Os dados administrativos exigem sessão autenticada, cookie HttpOnly e CSRF nas alterações.

A central recebe resultados/feedbacks apenas dos jogos que foram efetivamente integrados; cadastrar um endereço não altera automaticamente outro aplicativo. O Site original e o painel do Escritório em Ação não são migrados por esta implantação.
