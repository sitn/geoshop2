"""
Django settings for geoshop_backend project.

Generated by 'django-admin startproject' using Django 3.0.3.

For more information on this file, see
https://docs.djangoproject.com/en/3.0/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/3.0/ref/settings/
"""

import os

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/3.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'd^^+o7tg+z3uz)ar^m%xu+^0h-_sj$#ots1*d5kitdu71363x('

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DEBUG', False)

ALLOWED_HOSTS = os.environ["ALLOWED_HOST"].split(",")
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'localhost')
DOCUMENT_BASE_URL = os.environ.get('DOCUMENT_BASE_URL', 'http://example.com')

#
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'no-reply@ne.ch')
ADMIN_EMAIL_LIST = os.environ.get('ADMIN_EMAIL_LIST', 'no-reply@ne.ch')

# Application definition

INSTALLED_APPS = [
    'api.apps.ApiConfig',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.gis',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'djmoney',
    'allauth',
    'allauth.account',
    'rest_framework',
    'rest_framework_gis',
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': ['api/templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'wsgi.application'


# Database
# https://docs.djangoproject.com/en/3.0/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': os.environ["PGDATABASE"],
        'USER': os.environ["PGUSER"],
        'HOST': os.environ["PGHOST"],
        'PORT': os.environ["PGPORT"],
        'PASSWORD': os.environ["PGPASSWORD"],
        'OPTIONS': {
            'options': '-c search_path=' + os.environ["PGSCHEMA"] + ',public'
        },
    }
}


# Password validation
# https://docs.djangoproject.com/en/3.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/3.0/topics/i18n/

LANGUAGE_CODE = 'fr-ch'

LOCALE_PATHS = [
    './conf/locale',
    './api/locale',
]

TIME_ZONE = 'Europe/Zurich'

USE_I18N = True

USE_L10N = True

USE_TZ = True

SITE_ID = 2

VAT = 0.077

# Django REST specific configuration
# https://www.django-rest-framework.org/
REST_FRAMEWORK = {
    # Use Django's standard `django.contrib.auth` permissions,
    # or allow read-only access for unauthenticated users.
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.DjangoModelPermissionsOrAnonReadOnly'
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.LimitOffsetPagination',
    'PAGE_SIZE': 100
}

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/3.0/howto/static-files/

USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
FORCE_SCRIPT_NAME = os.environ.get('ROOTURL', '')

STATIC_URL = FORCE_SCRIPT_NAME + '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'static')
MEDIA_ROOT = os.environ.get('MEDIA_ROOT', os.path.join(BASE_DIR, 'files'))
MEDIA_URL = os.environ.get('MEDIA_URL', FORCE_SCRIPT_NAME + '/files/')

if os.environ.get('GDAL_IN_VENV', None) == "True":
    GDAL_LIBRARY_PATH = os.path.join(BASE_DIR, '.venv/Lib/site-packages/osgeo/gdal204.dll')

FRONT_PROTOCOL = os.environ["FRONT_PROTOCOL"]
FRONT_URL = os.environ["FRONT_URL"]
FRONT_HREF = os.environ.get("FRONT_HREF", '')
CSRF_COOKIE_DOMAIN = os.environ["CSRF_COOKIE_DOMAIN"]
CSRF_TRUSTED_ORIGINS = os.environ["ALLOWED_HOST"].split(",")
CORS_ORIGIN_WHITELIST = [
    os.environ["FRONT_PROTOCOL"] + '://' + os.environ["FRONT_URL"],
]
DEFAULT_PRODUCT_THUMBNAIL_URL = 'default_product_thumbnail.png'
DEFAULT_METADATA_IMAGE_URL = 'default_metadata_image.png'
AUTO_LEGEND_URL = os.environ.get('AUTO_LEGEND_URL', '')
INTRA_LEGEND_URL = os.environ.get('INTRA_LEGEND_URL', '')

# Geometries settings
DEFAULT_SRID = 2056
EXTRACT = 2056
DEFAULT_SRID = 2056
