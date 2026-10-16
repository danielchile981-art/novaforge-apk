# Fuga do Leg Day

Jogo HTML5 offline em um único `www/index.html`, empacotado com Capacitor 7 para Android 6 ou superior. Sem anúncios, cadastro, rastreamento, imagens, fontes ou áudio externos.

## Fase 1 — Jogo

Abra `www/index.html` diretamente no navegador. HTML, CSS e JavaScript estão no mesmo arquivo e comentados em português. Não há build web.

- Espaço, seta para cima, clique, toque ou botão PULAR: pular.
- Seta para baixo, swipe para baixo ou botão AGACHAR: agachar. Segure o botão para continuar agachado.
- Tênis: pulo duplo por 10 segundos. Água: invencibilidade por 3 segundos.
- Haltere, banco, whey e sofá: pular. Drone de pizza: passar por baixo agachado.
- Meta de 500 metros; dificuldade sobe a cada 15 segundos. Pontos: metros + 50 por power-up.
- Recorde salvo no localStorage. Som sintetizado é liberado pela primeira interação.
- Trocar de aba ou aplicativo pausa o jogo. `P` ou botão superior pausa manualmente.
- “E O CARDIO?” aparece apenas no encerramento, com pulso e batida cardíaca.

## Fase 2 — Capacitor

Pré-requisitos: Node 20+, npm, JDK 21 e Android Studio Ladybug ou posterior com SDK 35 e Build Tools 35.0.0. O workflow usa Node 20, conforme solicitado; para evoluir o projeto, migre juntos o Node e o Capacitor para versões suportadas.

Para usar este projeto pronto:

```bash
npm ci
npx cap sync android
```

Para reproduzir a inicialização em uma nova pasta, depois de salvar o HTML em `www/index.html`:

```bash
npm init -y
npm i --save-exact @capacitor/core@7.4.3
npm i -D --save-exact @capacitor/cli@7.4.3
npm i --save-exact @capacitor/android@7.4.3
npx cap init "Fuga do Leg Day" "com.fugadolegday.app" --web-dir=www
npx cap add android
python3 scripts/configure_android.py
npx cap sync android
```

Não use `--web-dir=.`: a raiz contém `android` e `node_modules`, e não deve ser copiada para o pacote web. A configuração completa está em `capacitor.config.json`. O `package-lock.json` está versionado para o `npm ci`.

## Fase 3 — GitHub Actions

Estrutura:

```text
.github/workflows/build-android.yml
android/                       projeto nativo e Gradle wrapper
capacitor.config.json
package.json
package-lock.json
scripts/configure_android.py
scripts/sign_release.py
www/index.html
README.md
.gitignore
```

O workflow completo está em `.github/workflows/build-android.yml`. Executa automaticamente em pushes para `main` e `fuga-do-leg-day`, instala Node 20, JDK 21, SDK 35, roda `npm ci`, sincroniza e compila release. Os artefatos ficam disponíveis por 30 dias.

Sem secrets, entrega um APK **sem assinatura**, que precisa ser assinado antes de instalar. Com os quatro secrets, entrega `Fuga-do-Leg-Day.apk` já assinado e verificado. A chave nunca é adicionada ao código.

Se já recebeu o backup privado da primeira assinatura, use essa chave para manter compatibilidade com o APK instalado. Não gere outra.

Para criar uma chave manualmente, somente se ainda não existe:

```bash
keytool -genkey -v -keystore release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias release
```

O comando pergunta senhas e dados do certificado. Guarde as senhas e a chave.

Base64 no Linux/macOS:

```bash
base64 < release.jks | tr -d '\n' > KEYSTORE_BASE64.txt
```

No PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$PWD/release.jks")) | Set-Content -NoNewline KEYSTORE_BASE64.txt
```

No repositório, abra **Settings > Secrets and variables > Actions > New repository secret** e cadastre:

| Secret | Valor |
| --- | --- |
| KEYSTORE_BASE64 | Texto do arquivo KEYSTORE_BASE64.txt |
| KEYSTORE_PASSWORD | Senha do keystore |
| KEY_ALIAS | release |
| KEY_PASSWORD | Senha da chave |

O backup criado por `scripts/sign_release.py` já contém a chave, o Base64 e `credentials.json` com os valores reais. Não publique o backup.

## Fase 4 — Mobile

Os botões visíveis, toque, swipe, viewport e prevenção de rolagem já estão no HTML.

`android/app/src/main/AndroidManifest.xml` contém `android:screenOrientation="landscape"` na Activity. `MainActivity.java` habilita tela cheia com barras acessíveis por gesto.

O script `python3 scripts/configure_android.py` configura orientação, ícone vetorial e splash. Arquivos:

- `android/app/src/main/res/drawable/ic_launcher_foreground.xml`: desenho do ícone.
- `android/app/src/main/res/mipmap/ic_launcher.xml`: ícone para Android antigo.
- `android/app/src/main/res/mipmap-anydpi-v26/`: ícones adaptativos.
- `android/app/src/main/res/drawable/splash.xml`: splash antigo.
- `android/app/src/main/res/values/styles.xml`: splash moderno e cores.

Para personalizar no Android Studio:

```bash
npx cap open android
```

Use **app > New > Image Asset** para ícones e ajuste os recursos de splash. Depois atualize ou remova as sobrescritas correspondentes em `scripts/configure_android.py`, pois o CI executa esse script.

## Fase 5 — Gerar e instalar

Nesta entrega, o jogo fica na branch `fuga-do-leg-day`, separada do outro aplicativo do repositório. Para enviar uma edição a partir de um clone desta branch:

```bash
git add .
git commit -m "Atualiza Fuga do Leg Day"
git push origin fuga-do-leg-day
```

Abra **Actions > Fuga do Leg Day - Android > execução mais recente > Artifacts** e baixe `Fuga-do-Leg-Day-Android`. Extraia o ZIP.

Se o artefato contém `Fuga-do-Leg-Day-unsigned.apk`, assine com sua chave persistente:

```bash
python3 scripts/sign_release.py Fuga-do-Leg-Day-unsigned.apk
```

Esse comando assume `ANDROID_HOME` configurado e Build Tools 35.0.0 instalado. Alternativamente passe `--tools` seguido do caminho real do diretório Build Tools. A primeira execução cria a chave e o backup em `../fuga-do-leg-day-assinatura`; as seguintes reutilizam essa chave.

Para instalar por USB, ative **Opções do desenvolvedor > Depuração USB**, conecte, aceite a autorização e rode:

```bash
adb devices
adb install -r Fuga-do-Leg-Day.apk
```

Também é possível abrir o APK no celular e permitir instalações para o aplicativo usado para abri-lo. Uma instalação com assinatura diferente exige remover a versão anterior; isso apaga o recorde local.

Build local de debug:

```bash
npm ci
npx cap sync android
cd android
./gradlew assembleDebug
```

No Windows use `gradlew.bat assembleDebug`. Resultado: `android/app/build/outputs/apk/debug/app-debug.apk`. Debug é assinado com chave de desenvolvimento.

Build local de release, a partir da raiz:

```bash
npm ci
npx cap sync android
cd android
./gradlew assembleRelease
cd ..
python3 scripts/sign_release.py android/app/build/outputs/apk/release/app-release-unsigned.apk
```

## Fase 6 — Google Play (opcional)

```bash
cd android
./gradlew bundleRelease
cd ..
python3 scripts/sign_release.py android/app/build/outputs/bundle/release/app-release.aab
```

Resultado assinado: `android/app/build/outputs/bundle/release/Fuga-do-Leg-Day.aab`. AAB usa `jarsigner`, não `apksigner`.

1. Crie conta no Google Play Console, pague a taxa apresentada e conclua a verificação de identidade e, quando exigida, de dispositivo.
2. Crie o app, configure Play App Signing e use a mesma chave como upload key quando apropriado.
3. Confira o target SDK exigido **na data da publicação**; este projeto usa SDK 35 e pode precisar de atualização antes de publicar.
4. Envie o AAB primeiro para teste interno/fechado e teste em dispositivos reais. Novas contas pessoais podem precisar cumprir teste fechado e solicitar acesso à produção.
5. Preencha título, descrição, ícone, screenshots, público-alvo, classificação etária, declaração de anúncios, segurança de dados, acesso ao app e política de privacidade exigida pela Play.
6. Corrija os avisos da Play Console e envie a versão para revisão.

Antes de cada nova publicação, aumente `versionCode` em `android/app/build.gradle` e ajuste `versionName`.

## Verificação final no celular

Abra offline; comece; pule por botão e toque; agache por botão e swipe; pegue os power-ups; confira pausa ao trocar de app; confira tela de derrota e vitória aos 500 m; feche e abra para conferir o recorde. A assinatura e o build não substituem esse teste em aparelho real.
