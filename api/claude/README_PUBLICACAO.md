# CORYTAX V15 — Web Serverless com CNAE IBGE e Complementação Manual

Esta versão foi preparada para publicação gratuita na Vercel, sem depender de servidor local ou arquivos no computador do usuário final.

## Estrutura

```text
CORYTAX_V15_WEB_SERVERLESS_CNAE/
  public/
    index.html
    config.js
  api/
    tributos/[...path].js
    ibge/[...path].js
    lead.js
  package.json
  vercel.json
  .env.example
```

## O que esta versão faz

- Mantém o HTML principal do CORYTAX como aplicação web.
- Usa `/api/tributos` como proxy serverless para a API oficial da Calculadora de Tributos do Consumo.
- Usa `/api/ibge` como proxy serverless para a API CNAE do IBGE.
- Remove a URL do Google Apps Script do front-end. O envio de lead passa por `/api/lead`.
- Permite complementação manual de campos ausentes quando o XML não traz os dados necessários.
- Permite criar item manual mesmo sem XML.
- Mostra status por item: pronto para cálculo oficial, consulta parcial possível ou pendente de complementação.

## Publicação gratuita recomendada: Vercel

1. Crie uma conta gratuita na Vercel.
2. Crie um repositório no GitHub com os arquivos desta pasta.
3. Importe o repositório na Vercel.
4. A Vercel detectará as funções em `api/` e publicará o site automaticamente.
5. O site ficará disponível em uma URL parecida com:

```text
https://seu-projeto.vercel.app
```

## Variáveis de ambiente na Vercel

Acesse o projeto na Vercel > Settings > Environment Variables.

Configure, se necessário:

```text
TRIBUTOS_TARGET_BASE=https://consumo.tributos.gov.br:60442/servico/calcular-tributos-consumo/api
TRIBUTOS_TIMEOUT_MS=30000
IBGE_TIMEOUT_MS=20000
CORYTAX_ALLOW_ORIGIN=https://seu-projeto.vercel.app
APPS_SCRIPT_URL=https://script.google.com/macros/s/SEU_ID/exec
```

`APPS_SCRIPT_URL` é opcional. Se não for configurada, o diagnóstico funciona, mas o lead não será encaminhado para planilha/CRM.

## Observação sobre a API oficial de tributos

A função serverless chama a API oficial em `consumo.tributos.gov.br:60442`. Alguns provedores gratuitos podem bloquear saída para portas não padrão. Se isso ocorrer, a função retornará erro informando o bloqueio. Nesse caso, será necessário usar outro provedor de backend ou uma versão da calculadora oficial em ambiente controlado.

## Campos mínimos para cálculo oficial

Para o motor executar observabilidade/cálculo por item, cada item precisa de:

- CST IBS/CBS;
- cClassTrib;
- município IBGE com 7 dígitos;
- base de cálculo ou valor da operação.

Sem esses campos, o CORYTAX ainda tenta consultas parciais por NCM, NBS, cClassTrib e CNAE IBGE.

## Segurança

- Nenhuma chave privada deve ser colocada no `public/index.html` ou no `public/config.js`.
- URLs sensíveis, como Apps Script, devem ficar em variáveis de ambiente da Vercel.
- O envio de XML/dados fiscais à API oficial deve ocorrer somente após o usuário aceitar a consulta oficial no fluxo do produto.
