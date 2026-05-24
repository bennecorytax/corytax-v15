# CORYTAX V14 — Web Produção

Esta versão resolve o problema do HTML depender do computador local. O pacote entrega o produto em arquitetura de produção:

```text
Usuário no navegador
  -> Site CORYTAX hospedado
  -> Backend/proxy CORYTAX online
  -> API oficial da Calculadora de Tributos
  -> Backend/proxy CORYTAX
  -> Laudo CORYTAX
```

## Arquivos principais

```text
server.js                     Backend Node.js que serve o site e faz proxy para a API oficial
public/index.html             Interface CORYTAX V14
public/config.js              Configuração da URL do backend/proxy usada pelo frontend
package.json                  Script de start para hospedagem Node.js
.env.example                  Variáveis de ambiente recomendadas
```

## Modo recomendado: tudo no mesmo domínio

Hospede este pacote em um serviço Node.js. O mesmo servidor entrega o HTML e a rota `/api/tributos`.

Nesse modo, o `public/config.js` deve ficar assim:

```js
window.CORYTAX_TRIBUTOS_API_PROXY_BASE = window.CORYTAX_TRIBUTOS_API_PROXY_BASE || '/api/tributos';
```

Exemplo de URLs em produção:

```text
https://app.corytax.com.br/                         -> abre o sistema
https://app.corytax.com.br/health                   -> testa o backend CORYTAX
https://app.corytax.com.br/api/tributos/...         -> proxy para a API oficial
```

## Modo alternativo: frontend e backend separados

Se o HTML ficar em um site estático e o backend em outro domínio, edite `public/config.js`:

```js
window.CORYTAX_TRIBUTOS_API_PROXY_BASE = 'https://api.corytax.com.br/api/tributos';
```

No backend, configure a variável `CORYTAX_ALLOW_ORIGIN` com o domínio do frontend:

```text
CORYTAX_ALLOW_ORIGIN=https://app.corytax.com.br
```

## Como testar localmente antes de publicar

```bash
npm start
```

Abra:

```text
http://localhost:8787/
http://localhost:8787/health
http://localhost:8787/api/tributos/calculadora/dados-abertos/versao
```

Se `/health` funcionar, o backend está no ar. Se `/api/tributos/calculadora/dados-abertos/versao` retornar erro 502/504, o servidor não conseguiu acessar a API oficial. Verifique saída HTTPS para `consumo.tributos.gov.br` na porta `60442`.

## Variáveis de ambiente

Copie `.env.example` para `.env` se sua hospedagem suportar arquivo de ambiente, ou configure direto no painel do provedor.

```text
PORT=8787
TRIBUTOS_TARGET_BASE=https://consumo.tributos.gov.br:60442/servico/calcular-tributos-consumo/api
CORYTAX_ALLOW_ORIGIN=https://app.corytax.com.br
TRIBUTOS_TIMEOUT_MS=30000
MAX_BODY_BYTES=10485760
```

## Observação sobre cálculo por item

Mesmo com o backend funcionando, a API oficial só consegue calcular/observar itens quando a amostra tiver campos mínimos, como:

- CST IBS/CBS;
- cClassTrib;
- município IBGE com 7 dígitos;
- base de cálculo ou valor da operação.

Quando esses dados não existirem no XML atual, o CORYTAX deve tratar como pendência de parametrização, não como erro técnico.

## Publicação em servidor Node.js

1. Suba esta pasta para o servidor.
2. Configure as variáveis de ambiente.
3. Execute:

```bash
npm start
```

4. Aponte o domínio para a aplicação.
5. Teste `/health` e depois o botão **Testar / consultar API oficial** no sistema.

## Segurança e LGPD

Para produção real, recomenda-se:

- usar HTTPS obrigatório;
- restringir `CORYTAX_ALLOW_ORIGIN` ao domínio do frontend;
- registrar logs técnicos sem salvar XML integral desnecessariamente;
- obter aceite do cliente para envio de dados fiscais à camada oficial;
- aplicar limite de tamanho para XML/lotes;
- separar erro técnico, pendência fiscal e ausência de campo no laudo.
