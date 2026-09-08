import type { AppSpec } from "../types.ts";

export function buildExportExtras(spec: AppSpec): Record<string, string> {
  const appId = `app.novaforge.${spec.slug.replace(/[^a-z0-9]/g, "") || "app"}`;
  return {
    "package.json": JSON.stringify(
      {
        name: spec.slug || "app",
        private: true,
        version: "1.0.0",
        description: spec.description,
        scripts: {
          build: "node scripts/build.mjs",
          sync: "npm run build && npx cap sync android",
        },
        dependencies: {
          "@capacitor/android": "^8.0.0",
          "@capacitor/core": "^8.0.0",
        },
        devDependencies: {
          "@capacitor/cli": "^8.0.0",
        },
      },
      null,
      2,
    ),
    "capacitor.config.json": JSON.stringify(
      {
        appId,
        appName: spec.name,
        webDir: "dist",
        android: { allowMixedContent: true },
      },
      null,
      2,
    ),
    "scripts/build.mjs": `import { cpSync, mkdirSync, existsSync } from "node:fs";

mkdirSync("dist", { recursive: true });
cpSync("www", "dist", { recursive: true });
if (!existsSync("dist/index.html")) {
  console.error("Falha: dist/index.html não foi gerado. A pasta www precisa conter index.html.");
  process.exit(1);
}
console.log("Build OK → dist/index.html");
`,
    ".github/workflows/android-apk.yml": `name: Android APK
on:
  workflow_dispatch:
  push:
    branches: [main]
jobs:
  apk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "24"
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "21"
      - name: Instalar dependências
        run: npm ci || npm install
      - name: Build web
        run: npm run build
      - name: Verificar index.html
        run: test -f dist/index.html
      - name: Capacitor Android
        run: |
          npx cap add android || true
          npx cap sync android
      - name: Gradle APK debug
        working-directory: android
        run: chmod +x gradlew && ./gradlew assembleDebug --no-daemon
      - name: Publicar APK
        uses: actions/upload-artifact@v4
        with:
          name: app-debug
          path: android/app/build/outputs/apk/debug/*.apk
`,
    "README.md": `# ${spec.name}

Aplicativo gerado pelo NovaForge.

## O que este app faz

${spec.description}

Recursos: ${spec.features.join(", ") || "uso offline"}.

Os dados ficam salvos no aparelho (armazenamento local). Não é necessário servidor.

## Testar no navegador

Abra \`www/index.html\` ou, após instalar o Node.js:

\`\`\`
npm install
npm run build
\`\`\`

A pasta \`dist/\` sempre contém \`index.html\` depois do build — exigência do Capacitor.

## Gerar APK (Termux ou GitHub)

1. Instale Node.js.
2. \`npm install\`
3. \`npm run build\`
4. \`npx cap add android\` (somente a primeira vez)
5. \`npx cap sync android\`
6. Compile com Gradle **ou** envie este projeto ao GitHub e dispare o workflow **Android APK**.

O workflow publica o APK debug como artifact. Não precisa de secrets para o APK de teste.

## Permissões Android

${spec.permissions.length ? spec.permissions.join(", ") : "Nenhuma especial — o app funciona offline."}
`,
  };
}
