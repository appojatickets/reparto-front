"""Decode the Actions secret into runner-local files; never print signing material."""
import base64
import json
import os
import re
from pathlib import Path

bundle = os.environ.get('ANDROID_SIGNING_BUNDLE', '')
with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf-8') as output:
    if not bundle:
        output.write('configured=false\n')
    else:
        data = json.loads(bundle)
        password = data['password']
        alias = data['alias']
        if not isinstance(password, str) or not re.fullmatch(r'[A-Za-z0-9+/=]{16,128}', password):
            raise ValueError('Formato de contraseña de firma inválido')
        if alias != 'reparto':
            raise ValueError('Alias de firma inválido')
        print(f'::add-mask::{password}')
        key_path = Path(os.environ['RUNNER_TEMP']) / 'reparto-release.p12'
        key_path.write_bytes(base64.b64decode(data['keystore'], validate=True))
        key_path.chmod(0o600)
        with open(os.environ['GITHUB_ENV'], 'a', encoding='utf-8') as env:
            env.write(f'ANDROID_KEYSTORE_PATH={key_path}\nANDROID_KEYSTORE_PASSWORD={password}\nANDROID_KEY_ALIAS={alias}\n')
        output.write('configured=true\n')
