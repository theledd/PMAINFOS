# Sistema de Ordens de Serviço - PMA

Este é um sistema web para gerenciamento de ordens de serviço, desenvolvido para a Prefeitura Municipal de Aquidauana.

## Configuração e Hospedagem

### 1. Configurar o Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Crie um novo projeto
3. No menu lateral, clique em "Authentication"
4. Em "Sign-in method", habilite "Email/Password"
5. No menu lateral, clique em "Firestore Database"
6. Clique em "Create Database"
7. Escolha "Start in test mode"
8. Selecione a região mais próxima
9. Clique em "Enable"

### 2. Obter as Credenciais do Firebase

1. No console do Firebase, clique em "Project Settings" (ícone de engrenagem)
2. Role até "Your apps"
3. Clique no ícone "</>" para adicionar um app web
4. Dê um nome ao app (ex: "pma-os-web")
5. Copie o objeto `firebaseConfig`
6. Substitua o conteúdo do arquivo `firebase-config.js` com suas credenciais

### 3. Configurar o GitHub Pages

1. Crie uma conta no [GitHub](https://github.com)
2. Crie um novo repositório público
3. Faça upload dos arquivos:
   - index.html
   - firebase-config.js
   - README.md
4. Vá em "Settings" > "Pages"
5. Em "Source", selecione "main"
6. Clique em "Save"

### 4. Configurar Regras do Firestore

1. No console do Firebase, vá para "Firestore Database"
2. Clique na aba "Rules"
3. Substitua as regras por:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

4. Clique em "Publish"

### 5. Acessar o Sistema

1. O sistema estará disponível em: `https://seu-usuario.github.io/pma-os`
2. Use as credenciais padrão:
   - Email: admin@sistema.local
   - Senha: senha123

## Funcionalidades

- Login/Cadastro de usuários
- Gerenciamento de ordens de serviço
- Painel administrativo
- Relatórios e exportação de dados
- Interface responsiva

## Suporte

Para suporte ou dúvidas, entre em contato com o Núcleo de Tecnologia da PMA.

## Segurança

- Todas as senhas são armazenadas de forma segura no Firebase
- O sistema usa autenticação por email/senha
- Os dados são protegidos por regras de segurança do Firestore
