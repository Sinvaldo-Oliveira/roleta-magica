# Guia de Deploy na Hostinger - Projeto WebSpin

Este guia descreve os passos para fazer o deploy da aplicação WebSpin (React + Node.js) em um ambiente de hospedagem da Hostinger.

## 1. Preparação do Ambiente Local

Antes de enviar os arquivos, certifique-se de que seu projeto está pronto para produção:

1.  **Instale as dependências:**
    ```bash
    npm install
    ```

2.  **Construa o frontend:**
    ```bash
    npm run build
    ```
    Isso irá gerar a pasta `dist/` com os arquivos estáticos do React.

## 2. Envio dos Arquivos para a Hostinger

1.  **Acesse o Gerenciador de Arquivos:** Faça login no painel da Hostinger e navegue até o Gerenciador de Arquivos do seu domínio.

2.  **Envie o Projeto:** Envie **todos os arquivos e pastas** do seu projeto para o diretório raiz da sua hospedagem (geralmente `public_html` ou um subdiretório, dependendo da sua configuração).

    **Estrutura esperada na Hostinger:**
    ```
    public_html/
    ├── api/
    ├── dist/
    ├── node_modules/  (será criado no servidor)
    ├── public/
    ├── src/
    ├── .env
    ├── index.html
    ├── package.json
    ├── package-lock.json
    └── ... (outros arquivos de configuração)
    ```

## 3. Configuração da Aplicação Node.js na Hostinger

1.  **Acesse o Terminal:** No painel da Hostinger, encontre a opção de **Terminal** ou **Acesso SSH** para executar comandos no servidor.

2.  **Instale as Dependências no Servidor:**
    ```bash
    npm install
    ```
    Este comando irá instalar as dependências listadas no `package.json` e criar a pasta `node_modules` no servidor.

3.  **Inicie a Aplicação:**
    A Hostinger geralmente fornece uma interface para configurar aplicações Node.js. Procure por "Setup Node.js App" ou similar.

    -   **Application startup file:** `api/app.js`
    -   **Application mode:** `production`

    Após configurar, clique em **Start App**. A Hostinger usará o script `npm start` que definimos, que por sua vez executa `node api/app.js`.

## 4. Verificação

-   Acesse a URL do seu domínio (`https://webspin.conecteplus.com/`). A aplicação React deve carregar.
-   Teste as funcionalidades que dependem da API (login, cadastro de campanha, etc.) para garantir que o backend está respondendo corretamente.

## Solução de Problemas

-   **Erro 503 (Service Unavailable):** Verifique os logs da aplicação Node.js no painel da Hostinger. Pode haver um erro no `api/app.js` ou as dependências não foram instaladas corretamente.
-   **Página em branco ou erro 404 em rotas internas:** Isso geralmente indica que o servidor não está redirecionando as requisições para o `index.html`. A configuração que fizemos no `api/app.ts` deve resolver isso, mas verifique se o servidor está realmente executando o arquivo correto.
-   **Variáveis de Ambiente:** Certifique-se de que o arquivo `.env` foi enviado para o servidor e que as variáveis de ambiente (como as chaves do Supabase) estão corretas para o ambiente de produção.
