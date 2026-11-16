import os
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.environ["SECRET_KEY"]
DEBUG = os.environ.get("DEBUG") == "1"
ALLOWED_HOSTS = [h for h in os.environ.get("ALLOWED_HOSTS", "").split(",") if h]
CSRF_TRUSTED_ORIGINS = [o for o in os.environ.get("CSRF_TRUSTED_ORIGINS", "").split(",") if o]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # "django.contrib.gis",   # uključiti kad su GDAL/GEOS dostupni
    "ninja",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    "allauth.headless",
    "core",
    "dhmz",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "allauth.account.middleware.AccountMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# Baza: PostgreSQL iz DATABASE_URL, a bez njega SQLite
DATABASES = {
    "default": dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=600,
    )
}

AUTH_USER_MODEL = "core.User"

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]

AUTH_PASSWORD_VALIDATORS = []  # nema lozinki, prijava je samo Google računom (C-02)

# Jezik i vrijeme (NF-28): u bazi UTC, prikaz Europe/Zagreb
LANGUAGE_CODE = "hr"
TIME_ZONE = "Europe/Zagreb"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Izgrađeni React frontend (npm run build u ../frontend). WhiteNoise ga poslužuje s korijena
# domene, a "/" vraća index.html. Bez builda (lokalni razvoj uz Vite) ovo ostaje isključeno.
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"
if FRONTEND_DIST.is_dir():
    WHITENOISE_ROOT = FRONTEND_DIST
    WHITENOISE_INDEX_FILE = True

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# --- allauth (headless, samo Google) ---
HEADLESS_ONLY = True
HEADLESS_CLIENTS = ("browser",)
HEADLESS_SERVE_SPECIFICATION = True
SOCIALACCOUNT_ONLY = True
ACCOUNT_EMAIL_VERIFICATION = "none"
SOCIALACCOUNT_PROVIDERS = {
    "google": {
        "APPS": [
            {
                "client_id": os.environ.get("GOOGLE_CLIENT_ID", ""),
                "secret": os.environ.get("GOOGLE_CLIENT_SECRET", ""),
                "key": "",
            }
        ],
        "SCOPE": ["profile", "email"],
    }
}
# Prva prijava traži korisničko ime i potvrdu privatnosti (UC-003, tok 4a)
SOCIALACCOUNT_AUTO_SIGNUP = False
ACCOUNT_SIGNUP_FORM_CLASS = "core.forms.PrivacySignupForm"  # polje privacy_notice_accepted
ACCOUNT_USERNAME_VALIDATORS = "core.validators.username_validators"

# Kamo allauth šalje korisnika ako Google prijava ne uspije. Inače ga vraća na
# callback_url koji šalje frontend (npr. /?racun=povratak).
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
HEADLESS_FRONTEND_URLS = {
    "socialaccount_login_error": f"{FRONTEND_URL}/?racun=greska",
}

# Google računi koji pri prijavi postaju administratori (UC-020), odvojeni zarezom
ADMIN_EMAILS = [e.strip().lower() for e in os.environ.get("ADMIN_EMAILS", "").split(",") if e.strip()]
# --- Podaci DHMZ-a (F-026) ---
DHMZ_MEASUREMENTS_URL = os.environ.get("DHMZ_MEASUREMENTS_URL", "https://vrijeme.hr/hrvatska_n.xml")
# P-10: zadano 30 min, nikad kraće od 10 min (uvjeti korištenja DHMZ-a)
DHMZ_FETCH_INTERVAL_MIN = max(10, int(os.environ.get("DHMZ_FETCH_INTERVAL_MIN", "30")))
# --- Sigurnost u produkciji (NF-12) ---
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"