import os
from dotenv import load_dotenv
from django.utils.translation import gettext_lazy as _
load_dotenv()

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/3.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('SECRET_KEY')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False

# Only for windows dev mode without docker
if os.name == 'nt' and os.environ.get('DEBUG'):
    DEBUG = True
    #GDAL_LIBRARY_PATH = 'C:/OSGeo4W/bin/gdal302'
    #GEOS_LIBRARY_PATH = 'C:/OSGeo4W/bin/geos_c'

ALLOWED_HOSTS = os.environ["ALLOWED_HOST"].split(",")
X_FRAME_OPTIONS = 'ALLOW-FROM https://sitnintra.ne.ch/'
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'localhost')
#EMAIL_PORT = os.environ.get('EMAIL_PORT', 1025)
# Setting to test email sending in console
EMAIL_BACKEND = os.environ.get('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')

#
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'no-reply@ne.ch')
ADMIN_EMAIL_LIST = os.environ.get('ADMIN_EMAIL_LIST', 'no-reply@ne.ch')
REPLY_TO_EMAIL = os.environ.get('REPLY_TO_EMAIL', 'no-reply@ne.ch')

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
    'rest_framework_simplejwt',
    'corsheaders',
    'health_check',
    'health_check.db',
    'health_check.contrib.migrations',
    'django_extended_ol',
    'pgtrigger',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'allauth.account.middleware.AccountMiddleware',
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

LANGUAGE_CODE = os.getenv('DEFAULT_LANGUAGE', 'fr')
DEFAULT_CURRENCY = 'CHF'

LOCALE_PATHS = [
    './api/locale',
    './locale',
]

LANGUAGES = (
    ('fr', _('French')),
)

TIME_ZONE = 'Europe/Zurich'
DATE_FORMAT = '%d.%m.%Y'
USE_I18N = True

USE_L10N = True

USE_TZ = True

SITE_ID = 2

VAT = 0.081

# Database
# https://docs.djangoproject.com/en/3.0/ref/settings/#databases
DEFAULT_AUTO_FIELD = 'django.db.models.AutoField'
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

# Special needs for geoshop running on PostgreSQL
SPECIAL_DATABASE_CONFIG = {
    # A search config with this name must exist on your database, please refer to
    # https://www.postgresql.org/docs/current/textsearch-intro.html#TEXTSEARCH-INTRO-CONFIGURATIONS
    'FTS_SEARCH_CONFIG': LANGUAGE_CODE
}

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'simple': {
            'format': '{levelname} {module} {filename} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': os.getenv('LOGGING_LEVEL', 'ERROR'),
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': os.getenv('LOGGING_LEVEL', 'ERROR'),
            'propagate': True,
        },
        # uncomment this for DB logging
        #'django.db.backends': {
        #    'level': 'DEBUG',
        #    'handlers': ['console'],
        #}
    },
}

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
FORCE_SCRIPT_NAME = os.environ.get('FORCE_SCRIPT_NAME', '')
ROOTURL=os.getenv('ROOTURL', '')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
# For large admin fields like order with order items
DATA_UPLOAD_MAX_NUMBER_FIELDS = 5000

STATIC_URL = FORCE_SCRIPT_NAME + ROOTURL + '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'static')
MEDIA_ROOT = os.environ.get('MEDIA_ROOT', os.path.join(BASE_DIR, 'files'))
MEDIA_URL = os.environ.get('MEDIA_URL', FORCE_SCRIPT_NAME + ROOTURL +'/files/')

FRONT_PROTOCOL = os.environ["FRONT_PROTOCOL"]
FRONT_URL = os.environ["FRONT_URL"]
FRONT_HREF = os.environ.get("FRONT_HREF", '')
CSRF_COOKIE_DOMAIN = os.environ["CSRF_COOKIE_DOMAIN"]
CSRF_TRUSTED_ORIGINS = []

for host in ALLOWED_HOSTS:
    CSRF_TRUSTED_ORIGINS.append(f'http://{host}')
    CSRF_TRUSTED_ORIGINS.append(f'https://{host}')

CORS_ORIGIN_WHITELIST = [
    os.environ["FRONT_PROTOCOL"] + '://' + os.environ["FRONT_URL"],
    'http://localhost:5173',
    'https://localhost:5173',
    'https://ne-prod.ne.ch',
    'https://ne-prod-admin.ne.ch',
    'https://www.ne.ch',
]
DEFAULT_PRODUCT_THUMBNAIL_URL = 'default_product_thumbnail.png'
DEFAULT_METADATA_IMAGE_URL = 'default_metadata_image.png'
AUTO_LEGEND_URL = os.environ.get('AUTO_LEGEND_URL', '')
INTRA_LEGEND_URL = os.environ.get('INTRA_LEGEND_URL', '')
BACKEND_URL = os.environ.get("BACKEND_URL", "localhost:8000")
# Geometries settings
DEFAULT_SRID = int(os.environ.get('DEFAULT_SRID', '2056'))

# Neuch
DEFAULT_EXTENT = [2420000, 1030000, 2900000, 1360000]

# Controls values of metadata accessibility field that will turn the metadata public
METADATA_PUBLIC_ACCESSIBILITIES = ['PUBLIC', 'APPROVAL_NEEDED', 'NOT_ACCESSIBLE']

# Healthcheck subsets configuration
HEALTH_CHECK = {
    "SUBSETS": {
        "startup": ["MigrationsHealthCheck", "DatabaseBackend"],
        "readiness": ["DatabaseBackend"],
        "liveness": []
    },
}

FEATURE_FLAGS = {
    "oidc": os.environ.get("OIDC_ENABLED", "False") == "True",
    "registration": os.environ.get("REGISTRATION_ENABLED", "True") == "True",
    "local_auth": os.environ.get("LOCAL_AUTH_ENABLED", "True") == "True"
}

OLWIDGET = {
    "globals": {
        "srid": DEFAULT_SRID,
        "default_center": [2551470, 1211190], # optional
        "default_resolution": 18, # optional
        "extent": DEFAULT_EXTENT,
        "resolutions": [250, 100, 50, 20, 10, 5, 2.5, 2, 1.5, 1, 0.5, 0.25, 0.125, 0.0625]
    },
    "wmts": {
        "layer_name": 'plan_cadastral',
        "style": 'default',
        "matrix_set": 'EPSG2056',
        "attributions": '<a target="new" href="https://sitn.ne.ch/web/conditions_utilisation/contrat_SITN_MO.htm'
            + '">© SITN</a>', # optional
        "url_template": 'https://sitn.ne.ch/mapproxy95/wmts/1.0.0/{layer}/{style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png',
        "request_encoding": 'REST', # optional
        "format": 'image/png' # optional
    }
}
# Limit maximum allowed area of an order, in square meters. 0 for unlimited
MAX_ORDER_AREA=float(os.environ.get("MAX_ORDER_AREA", "0"))
