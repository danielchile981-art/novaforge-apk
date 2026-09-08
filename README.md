# NovaForge Studio

Edição unificada do construtor de aplicativos NovaForge, preparada para Android e uso direto no celular.

## Recursos

- geração local de aplicativos a partir de uma descrição;
- modelos prontos, prévia ao vivo e edição de código;
- projetos persistentes, histórico e versões restauráveis;
- backup completo em JSON e restauração no aparelho;
- exportação do projeto em ZIP;
- geração de APK via GitHub Actions;
- interface responsiva, modo claro/escuro, ícone e splash próprios.

## Desenvolvimento

Requer Node.js 24 e Java 21 para o fluxo Android.

```bash
npm ci
npm test
npm run build
npm run android:sync
```

Para compilar o APK em um ambiente Android configurado:

```bash
npm run android:apk
```

O APK de teste será criado em `android/app/build/outputs/apk/debug/app-debug.apk`.

## Backup

No aplicativo, abra **Configurações > Backup completo**. O token do GitHub nunca é incluído no arquivo de backup.
