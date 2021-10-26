# geoshop2

## Requirements

* PostgreSQL > 10 + PostGIS
* Python 3.6 / 3.7
* pipenv (pip install pipenv)
* GDAL 2.4 (see instructions below to install it in your venv)

## Getting started


Fork and clone this repository. Make a copy of the `.env` file and adapt it to your environment settings:

```powershell
cd back
cp .env.sample .env
cd..
```

### Database

The best is to backup and restore a production db. Otherwise, to start from scratch follow this:

Postrgres user `geoshop` is assumed to be already created. Set up a database manually or with the provided script in `scripts/create_db.ps1` (psql binary must be on PATH) :

```sql
CREATE DATABASE geoshop;
CREATE EXTENSION postgis;
CREATE SCHEMA geoshop AUTHORIZATION geoshop;
```

### Backend with docker

Create an .env.local based on .env.sample, then build:

```powershell
cd back
docker build -t geoshop_api --build-arg ENV_FILE=.env.local .
```

Now you can run it with:

```powershell
docker run -d --rm --name geoshop --env-file=.env.local -p 8000:8000 -v ${PWD}:/app/geoshop_back geoshop_api gunicorn --reload wsgi -b :8000
```

Run tests:

```powershell
docker run --rm --env-file=.env.local -v ${PWD}:/app/geoshop_back geoshop_api python manage.py test api
```

Make messages for translation:

```powershell
docker run --rm --env-file=.env.local -v ${PWD}:/app/geoshop_back:rw geoshop_api python manage.py makemessages -l fr
```

Stop the server:
```powershell
docker stop geoshop
```

### Backend without docker on windows

> :warning: **No longer maintained**: Installing GDAL in windows is really painfull, use docker for backend.

Install the app. If you want your `venv` to be inside your project directory, you need to set `PIPENV_VENV_IN_PROJECT` environment variable, otherwise it'll go to your profile, if you want `DEBUG` to be enabled, change it in `settings.py` file but never commit it with debug enabled:

```powershell
cd back
$env:PIPENV_VENV_IN_PROJECT="True"
pipenv install --dev           # installs everything needed
pipenv shell                   # activates venv and reads .env file
```

#### Installing GDAL on Windows, only once per machine
Download the GDAL 2.4 wheel (3.X isn't supported yet by Django) on this page: https://www.lfd.uci.edu/~gohlke/pythonlibs/#gdal. For example, if you have Python 3.6 64bit, choose `GDAL‑2.4.1‑cp36‑cp36m‑win_amd64.whl`.
Then install it weather system wide or in your venv (the example below will show the venv variant and expects you have your venv activated):

```powershell
pip install path\to\your\GDAL-2.4XXXX.whl
```

You'll then need to add GDAL dll to your PATH if you installed it system wide. You can get the dll path with:

```python
python

from pathlib import Path, PureWindowsPath
from osgeo import gdal

print(PureWindowsPath(gdal.__file__).parent)
```

Otherwise, if you installed it in your venv, configure `.env` properly.

### Migrate and run

You should now be able to run migrations:

```powershell
python manage.py migrate
```

If you're starting with a fresh new database you'll need to create an user or restore a dump:

```powershell
python manage.py createsuperuser --email admin@example.com --username admin
```

Your database should be ready, now you can run the backend:

```powershell
python manage.py runserver
```

Translations can be generated, static files collected with:

```powershell
python manage.py compilemessages --locale=fr
python .\manage.py collectstatic
```

Then, set `DEBUG` to `True` in `back/settings.py` and you can finally run the server:

```powershell
python manage.py runserver
```

> :warning: **DO NOT COMMIT settings.py with `DEBUG` set to `True` !**

### Run tests

```powershell
python manage.py test api
```

### Frontend

Install the current LTS version of [Nodejs](https://nodejs.org/en/).

Install @angular/cli and typescript globally

```powershell
npm install -g @angular/cli typescript
```

Install the dependances of the frontend

```powershell
cd front
npm install
```

Edit the settings, the file is /front/copy-config.ps1

Typicall values for dev purposes are:

```json
  "apiUrl": "https://sitn.ne.ch/geoshop2_prepub_api",
  "mediaUrl": "https://sitn.ne.ch/geoshop2_prepub_media/images",
```

To start the debug of the frontend

```powershell
npm start
```

1. Will run the batch /front/copy-config.ps1
2. Will automatically run chrome with insecure flags to allow CORS request
3. Chrome browser will be waiting with [Geoshop2](http://localhost:4200)

## Deploy

Create an `env.prod` file base on `env.sample`.

### Application deployment

```powershell
.\scripts\4_deploy_prod.ps1
```

Create a scheduled task that runs `scripts/geoshop_clean_orders.ps1` every month.

More info on bookstack
