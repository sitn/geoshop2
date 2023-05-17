import os
import pathlib
import datetime
import subprocess
import re

dest_config = input('Input "prod", "prepub", "dev" or "local": ')

BASE_DIR = pathlib.Path(__file__).parent.absolute()

def resub_callback(match):
    return os.environ.get(match.group(1), '')

def eval_templates(in_file, out_file):
    with open(in_file, "r", encoding="utf8") as f:
        file_content = f.read()
    file_content = re.sub(r'\$\{([A-Z_]+)\}', resub_callback, file_content)
    
    with open(out_file, "w", encoding="utf8") as f:
        f.write(file_content)

# Do not deploy to internet with DEBUG set to True
settings_path = f'{BASE_DIR}/../back/settings.py'
with open(settings_path, 'r') as f:
    settings = f.read()

is_debug = re.search(r'^DEBUG = (True)$', settings, re.MULTILINE)
if is_debug:
    if dest_config != "local":
        print("Cannot deploy if DEBUG=True in settings.py")
        quit()

env_file = f'{BASE_DIR}/../back/.env.{dest_config}'
# Read .env
with open(env_file, 'r') as f:
    for line in f:
        args = line.strip().split('=')
        if args[0] and not args[0].startswith('#'):
            os.environ[args[0].strip('"')] = args[1].strip('"')

os.environ['ENV_FILE'] = f".env.{dest_config}"
print(f"{str(datetime.datetime.now())} - COMPOSE_PROJECT_NAME IS {os.environ['COMPOSE_PROJECT_NAME']}")

eval_templates(f'{BASE_DIR}/../front/src/assets/configs/config.json.tmpl', f'{BASE_DIR}/../front/src/assets/configs/config.json')
eval_templates(f'{BASE_DIR}/../front/httpd.conf.tmpl', f'{BASE_DIR}/../front/httpd.conf')

print(f"{str(datetime.datetime.now())} - DOCKER_HOST IS {os.environ['DOCKER_HOST']}")

subprocess.run(['docker-compose', 'build', 'api'])
subprocess.run(['docker-compose', 'build', 'front'])
subprocess.run(['docker-compose', 'down'])
subprocess.run(['docker-compose', 'up', '-d'])

print(f"{str(datetime.datetime.now())} - END")
