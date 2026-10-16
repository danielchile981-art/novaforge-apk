"""Assina APK/AAB usando uma chave persistente fora do repositório.
Uso: python3 scripts/sign_release.py arquivo.apk --tools /caminho/build-tools/35.0.0
A chave e as senhas ficam em ../fuga-do-leg-day-assinatura. Guarde esse diretório.
"""
from pathlib import Path
import argparse, json, os, secrets, subprocess, base64
parser = argparse.ArgumentParser()
parser.add_argument('input')
parser.add_argument('--tools', default=os.environ.get('ANDROID_HOME', '') + '/build-tools/35.0.0')
parser.add_argument('--backup', default=str(Path(__file__).resolve().parents[2]/'fuga-do-leg-day-assinatura'))
args=parser.parse_args()
source=Path(args.input).resolve()
if not source.is_file():
    raise SystemExit('Arquivo de entrada não encontrado.')
backup=Path(args.backup).resolve()
backup.mkdir(mode=0o700, parents=True, exist_ok=True)
key=backup/'release.jks'
credentials=backup/'credentials.json'
if key.exists() != credentials.exists():
    raise SystemExit('Backup incompleto. Restaure release.jks e credentials.json juntos.')
if not key.exists():
    password=secrets.token_urlsafe(32)
    data={'KEYSTORE_PASSWORD':password,'KEY_ALIAS':'release','KEY_PASSWORD':password}
    credentials.write_text(json.dumps(data, indent=2)+'\n')
    credentials.chmod(0o600)
    env=dict(os.environ, **data)
    subprocess.run(['keytool','-genkeypair','-noprompt','-keystore',str(key),'-storetype','JKS','-keyalg','RSA','-keysize','2048','-validity','10000','-alias','release','-storepass:env','KEYSTORE_PASSWORD','-keypass:env','KEY_PASSWORD','-dname','CN=Fuga do Leg Day, OU=Android, O=Independent Game, C=BR'],check=True,env=env)
    key.chmod(0o600)
else:
    data=json.loads(credentials.read_text())
env=dict(os.environ,**data)
(backup/'KEYSTORE_BASE64.txt').write_text(base64.b64encode(key.read_bytes()).decode()+'\n')
(backup/'KEYSTORE_BASE64.txt').chmod(0o600)
(backup/'LEIA-ME.txt').write_text('BACKUP PRIVADO DA ASSINATURA\nNão publique nem envie a outras pessoas. Guarde todos os arquivos.\nPara atualizar o app instalado, use sempre esta mesma chave.\nGitHub > Settings > Secrets and variables > Actions:\nKEYSTORE_BASE64: conteúdo de KEYSTORE_BASE64.txt\nDemais secrets: valores de credentials.json\n')
output=source.parent/('Fuga-do-Leg-Day.apk' if source.suffix=='.apk' else 'Fuga-do-Leg-Day.aab')
if source.suffix=='.apk':
    tools=Path(args.tools).resolve()
    aligned=source.parent/'legday-aligned.apk'
    subprocess.run([str(tools/'zipalign'),'-P','16','-f','4',str(source),str(aligned)],check=True)
    subprocess.run([str(tools/'apksigner'),'sign','--ks',str(key),'--ks-key-alias',data['KEY_ALIAS'],'--ks-pass','env:KEYSTORE_PASSWORD','--key-pass','env:KEY_PASSWORD','--out',str(output),str(aligned)],check=True,env=env)
    subprocess.run([str(tools/'apksigner'),'verify','--verbose','--print-certs',str(output)],check=True)
    aligned.unlink()
elif source.suffix=='.aab':
    import shutil
    shutil.copyfile(source,output)
    subprocess.run(['jarsigner','-keystore',str(key),'-storepass:env','KEYSTORE_PASSWORD','-keypass:env','KEY_PASSWORD',str(output),data['KEY_ALIAS']],check=True,env=env)
    subprocess.run(['jarsigner','-verify',str(output)],check=True)
else:
    raise SystemExit('Use um arquivo .apk ou .aab.')
print('Arquivo assinado:',output)
print('Backup privado:',backup)
