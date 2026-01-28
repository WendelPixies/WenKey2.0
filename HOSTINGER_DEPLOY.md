# Deploy para Hostinger - Guia Rápido

## ⚠️ IMPORTANTE: Não commitar o arquivo .env

O arquivo `.env` contém suas credenciais e **NÃO deve** ser enviado para o GitHub.

Antes de fazer push, execute:

```bash
git rm --cached .env
echo ".env" >> .gitignore
git add .gitignore
git commit -m "chore: Add .env to gitignore"
```

---

## 🚀 Opções de Deploy na Hostinger

### **Opção 1: Upload Manual via File Manager**

1. Acesse o **File Manager** da Hostinger
2. Navegue até a pasta `public_html` (ou a pasta do seu domínio)
3. **Delete todos os arquivos antigos** da pasta
4. Faça upload de **TODOS os arquivos** da pasta `dist/`:
   - `index.html`
   - `assets/` (pasta completa)
   - Todos os outros arquivos gerados

### **Opção 2: Via FTP**

1. Use um cliente FTP (FileZilla, WinSCP, etc.)
2. Conecte usando as credenciais FTP da Hostinger
3. Navegue até `public_html`
4. Delete arquivos antigos
5. Faça upload da pasta `dist/` completa

### **Opção 3: Via GitHub + Deploy Automático**

Se a Hostinger tem integração com GitHub:

1. **Primeiro, remova o .env do Git** (ver seção acima)
2. Faça push para o GitHub:
   ```bash
   git push origin main
   ```
3. Configure a Hostinger para:
   - Conectar ao repositório GitHub
   - Executar `npm install && npm run build`
   - **IMPORTANTE**: Configurar as variáveis de ambiente no painel da Hostinger:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_PUBLISHABLE_KEY`

---

## 📋 Checklist de Deploy

- [ ] Remover `.env` do Git (se for usar GitHub)
- [ ] Fazer backup dos arquivos atuais da Hostinger
- [ ] Limpar pasta `public_html` (ou pasta do domínio)
- [ ] Fazer upload dos arquivos da pasta `dist/`
- [ ] Verificar se `index.html` está na raiz
- [ ] Testar o site: `https://wenkey.app`
- [ ] Abrir DevTools Console e verificar logs:
  - ✅ `Supabase URL configured: true`
  - ✅ `Supabase Key configured: true`
  - ✅ `getSession() completed in XXXms`
- [ ] Testar login/logout
- [ ] Testar refresh da página

---

## 🔍 Verificação Pós-Deploy

Após fazer o deploy, abra `https://wenkey.app` e:

1. Abra o **DevTools** (F12)
2. Vá na aba **Console**
3. Procure por:
   - 🔐 "Starting auth initialization..."
   - 📍 "Supabase URL configured: true"
   - 🔑 "Supabase Key configured: true"

Se aparecer:
- ❌ "CRITICAL: Supabase environment variables are missing!"

Significa que as variáveis não foram injetadas corretamente no build.

---

## 🛠️ Troubleshooting

### Problema: "Auth initialization timed out"

**Solução**: Verifique no Supabase Dashboard:
- Authentication → URL Configuration
- Site URL = `https://wenkey.app`
- Redirect URLs = `https://wenkey.app/**`

### Problema: Página em branco

**Solução**: 
- Verifique se todos os arquivos da pasta `dist/` foram enviados
- Verifique se `index.html` está na raiz correta
- Verifique o console do navegador para erros

### Problema: 404 ao navegar entre páginas

**Solução**: Configure o `.htaccess` na Hostinger:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

## 📞 Precisa de Ajuda?

Se encontrar problemas:
1. Verifique os logs do console do navegador
2. Verifique se todos os arquivos foram enviados corretamente
3. Confirme que as configurações do Supabase estão corretas
