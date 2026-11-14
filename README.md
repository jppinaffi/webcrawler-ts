# webcrawler-ts

Monitor de preços de hardware para KaBuM!, Pichau e Terabyte. Verifica periodicamente os produtos configurados e envia um alerta no Telegram quando o produto está em estoque e o preço à vista é menor ou igual ao preço teto.

## Pré-requisitos

- Node.js 20 ou superior
- npm
- Um bot do Telegram (criado com o [@BotFather](https://t.me/BotFather)) e o Chat ID de destino
- PM2 (opcional, para rodar em segundo plano): `npm install -g pm2`

## Instalação

```bash
npm install
```

Dependências de runtime: `axios`, `cheerio`, `dotenv`.
Dependências de desenvolvimento: `typescript`, `tsx`, `@types/node`.

## Variáveis de ambiente

Copie o exemplo e preencha:

```bash
cp .env.example .env
```

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | Sim | Token do bot fornecido pelo @BotFather |
| `TELEGRAM_CHAT_ID` | Sim | ID do chat/usuário que receberá os alertas |
| `CHECK_INTERVAL_MINUTES` | Não | Intervalo entre ciclos de verificação em minutos (padrão: `10`) |

Para descobrir o Chat ID: envie qualquer mensagem ao seu bot e abra `https://api.telegram.org/bot<TOKEN>/getUpdates`. O valor está em `message.chat.id`.

## Configuração dos produtos

Os alvos ficam em `config.json`:

```json
{
  "targets": [
    {
      "id": "rtx-4060",
      "name": "Placa de Vídeo RTX 4060",
      "targetPrice": 1800,
      "links": [
        { "store": "kabum", "url": "https://www.kabum.com.br/produto/..." },
        { "store": "pichau", "url": "https://www.pichau.com.br/..." },
        { "store": "terabyte", "url": "https://www.terabyteshop.com.br/produto/..." }
      ]
    }
  ]
}
```

| Campo | Descrição |
| --- | --- |
| `id` | Identificador único do alvo |
| `name` | Nome amigável usado nos logs |
| `targetPrice` | Preço teto em reais; o alerta dispara se `preço <= targetPrice` |
| `links` | Lista de links do produto, cada um com `store` (`kabum`, `pichau` ou `terabyte`) e `url` |

O arquivo é relido a cada ciclo, então não é preciso reiniciar o processo ao editar os alvos.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Roda em desenvolvimento com `tsx` |
| `npm run build` | Compila o TypeScript para `dist/` |
| `npm start` | Roda a versão compilada (`dist/index.js`) |
| `npm run typecheck` | Verifica tipos sem gerar arquivos |

## Comportamento

- O ciclo roda continuamente no intervalo configurado.
- Entre cada requisição HTTP há um atraso aleatório (jitter) de 2 a 5 segundos, para evitar bloqueios por limite de taxa do Cloudflare/WAF.
- Falhas de requisição (403, 404, 500, timeout) ou ausência do JSON estruturado são registradas no console e o monitor segue para o próximo link, sem encerrar o processo.
- O alerta só é enviado se `inStock === true` e `price <= targetPrice`. O mesmo preço não é notificado repetidamente a cada ciclo; um novo alerta sai quando o preço muda ou depois que o produto sai da condição de alerta e volta a ela. Esse controle fica em memória e é zerado ao reiniciar.

## Rodando em segundo plano com PM2

```bash
npm run build
pm2 start dist/index.js --name webcrawler-ts
pm2 save
```

Comandos úteis:

```bash
pm2 status
pm2 logs webcrawler-ts
pm2 restart webcrawler-ts
pm2 stop webcrawler-ts
pm2 delete webcrawler-ts
```

Para iniciar automaticamente com o sistema:

- Linux/macOS: `pm2 startup` e execute o comando que ele exibir, depois `pm2 save`.
- Windows: `pm2 startup` não é suportado nativamente; use o pacote `pm2-windows-startup` (`npm install -g pm2-windows-startup`, depois `pm2-startup install` e `pm2 save`).

Depois de alterar o código, rode `npm run build` e `pm2 restart webcrawler-ts`. Alterações no `.env` exigem `pm2 restart webcrawler-ts`.
