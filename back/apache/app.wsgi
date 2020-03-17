import sys
import site
import os

# Get installed path
PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), os.pardir)

ALLDIRS = [
    os.path.join(PATH, ".venv\\Lib\\site-packages"),
    os.path.join(PATH, ".venv\\Lib\\site-packages\\osgeo")]

# Remember original sys.path.
prev_sys_path = list(sys.path)

# Add each new site-packages directory.
for directory in ALLDIRS:
  site.addsitedir(directory)

# Reorder sys.path so new directories at the front.
new_sys_path = []
for item in list(sys.path):
    if item not in prev_sys_path:
        new_sys_path.append(item)
        sys.path.remove(item)
sys.path[:0] = new_sys_path

sys.path.insert(0,PATH)

print("COUCOU",list(sys.path))

# Load env
from dotenv import load_dotenv
env_path = os.path.join(PATH, ".env")
load_dotenv(dotenv_path=env_path)

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')

application = get_wsgi_application()
