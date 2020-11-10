"""
WSGI config for geoshop_backend project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/3.0/howto/deployment/wsgi/
"""

import os
from whitenoise import WhiteNoise
from django.core.wsgi import get_wsgi_application

PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)))

env_path = os.path.join(PATH, ".env")

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')

application = get_wsgi_application()
application = WhiteNoise(application, root=os.path.join(PATH, "static"))
