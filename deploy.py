import os
import datetime
import subprocess
import re

dest_config = input('Input "prod", "prepub", "dev" or "local": ')

def resub_callback(match):
    return os.environ.get(match.group(1), '')

def eval_templates(in_file, out_file):
    with open(in_file, "r", encoding="utf8") as f:
        file_content = f.read()
    file_content = re.sub(r'\$\{([A-Z_]+)\}', resub_callback, file_content)
    
    with open(out_file, "w", encoding="utf8") as f:
        f.write(file_content)

env_file = f'.env.{dest_config}'
if dest_config == "local":
    env_file = '.env'

# Read .env
with open(env_file, 'r') as f:
    for line in f:
        args = line.strip().split('=')
        if args[0] and not args[0].startswith('#'):
            os.environ[args[0].strip('"')] = args[1].strip('"')

is_debug = os.environ['DEBUG'] == 'True'
if is_debug:
    if dest_config != "local":
        print("Cannot deploy if DEBUG=True for this config")
        quit()

os.environ['ENV_FILE'] = env_file
print(f"{str(datetime.datetime.now())} - COMPOSE_PROJECT_NAME IS {os.environ['COMPOSE_PROJECT_NAME']}")
print(f"{str(datetime.datetime.now())} - ENV_FILE IS {os.environ['ENV_FILE']}")

eval_templates(f'front/src/assets/configs/config.json.tmpl', f'front/src/assets/configs/config.json')
eval_templates(f'front/httpd.conf.tmpl', f'front/httpd.conf')

dest_docker_host = os.environ['DOCKER_HOST']
os.environ['DOCKER_HOST'] = ""
subprocess.run(['docker', 'compose', 'build'])

if dest_config != "local":
    subprocess.run(['docker', 'compose', 'push'])
    os.environ['DOCKER_HOST'] = dest_docker_host
    print(f"{str(datetime.datetime.now())} - DOCKER_HOST IS {os.environ['DOCKER_HOST']}")
    subprocess.run(['docker-compose', 'pull'])

subprocess.run(['docker-compose', 'down', '-v'])
subprocess.run(['docker-compose', 'up', '-d'])

print(f"{str(datetime.datetime.now())} - END")
