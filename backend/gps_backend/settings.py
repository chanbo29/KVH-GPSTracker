from pathlib import Path
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY  = config('SECRET_KEY', default='django-insecure-gps-dev-key')
DEBUG       = config('DEBUG', default=True, cast=bool)
ALLOWED_HOSTS = ['*']

# Vehicle/photo fields store images as base64 data-URLs directly on the
# model (see carmaint VehicleRoster.photo), so a single JSON request body
# can be a few MB. Django's default DATA_UPLOAD_MAX_MEMORY_SIZE (2.5MB)
# was silently rejecting those requests with a 400 before they ever
# reached a view -- raise it well above what a compressed photo needs.
DATA_UPLOAD_MAX_MEMORY_SIZE = 15 * 1024 * 1024  # 15MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 15 * 1024 * 1024  # 15MB

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'vehicles',
    'carmaint',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'gps_backend.urls'

TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [],
    'APP_DIRS': True,
    'OPTIONS': {'context_processors': [
        'django.template.context_processors.debug',
        'django.template.context_processors.request',
        'django.contrib.auth.context_processors.auth',
        'django.contrib.messages.context_processors.messages',
    ]},
}]

WSGI_APPLICATION = 'gps_backend.wsgi.application'

# ── MySQL Database ─────────────────────────────────────────────────────────────
DATABASES = {
    'default': {
        'ENGINE':   'django.db.backends.mysql',
        'NAME':     config('DB_NAME', default='kvh_gpstracker'),
        'HOST':     config('DB_HOST', default='localhost'),
        'PORT':     config('DB_PORT', default='3307'),
        'USER':     config('DB_USER', default='kvh_app'),
        'PASSWORD': config('DB_PASSWORD', default=''),
        'OPTIONS': {
            'charset': 'utf8mb4',
        },
    },
}
# The "Car Maintenance" feature set (the `carmaint` app) used to live in its own
# separate database via a DB router (carmaint/db_router.py, now unused). It has
# been merged back into the single 'default' database above, so its tables
# (VehicleRoster, VehicleUsers, OtherWorks, …) live alongside the Vehicles/
# Drivers/GPSLogs tables in kvh_gpstracker — one database, no router needed.

# ── REST Framework ─────────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.AllowAny'],
    'DEFAULT_RENDERER_CLASSES':   ['rest_framework.renderers.JSONRenderer'],
}

# ── CORS ───────────────────────────────────────────────────────────────────────
CORS_ALLOW_ALL_ORIGINS = True

LANGUAGE_CODE = 'en-us'
TIME_ZONE     = 'Asia/Phnom_Penh'
USE_I18N      = True
USE_TZ        = True

STATIC_URL = '/static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
