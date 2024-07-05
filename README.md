# Geoshop

## Requirements

* PostgreSQL >= 11 + PostGIS
* Python >= 3.9

## Getting started

Fork and clone this repository. Make a copy of the `.env` file and adapt it to your environment settings:

```powershell
git submodule init
git submodule update
cd back
cp .env.sample .env
cp default_settings.py settings.py
cd ..
```

### Database

The best is to backup and restore a production db:

```sql
.\scripts\sitn\1_fetch_prod_db.ps1
```

Now that the database is ready, you can start backend either with Docker or not.

### Backend with docker

To ease debug, you can add `DEBUG=True` to your `env.local` file. Never add this to a container exposed on internet.

Build backend image:

```powershell
cd back
docker build -t sitn/geoshop-dev-api --build-arg ENV_FILE=.env.local .
```

If you started with an empty database, run this once in order to create admin account:

```powershell
docker run --rm --name geoshop --env-file=.env.local sitn/geoshop-dev-api python manage.py fixturize
```

Now you can run it with:

```powershell
docker run -d --rm --name geoshop --env-file=.env.local -p 8000:8000 -v ${PWD}:/app/geoshop_back sitn/geoshop-dev-api gunicorn --reload wsgi -b :8000
```

You should be able to visit the API at http://localhost:8000.

Run tests:

```powershell
docker run --rm --env-file=.env.local -v ${PWD}:/app/geoshop_back sitn/geoshop-dev-api python manage.py test api
```

Make messages for translation:

```powershell
docker run --rm --env-file=.env.local -v ${PWD}:/app/geoshop_back:rw sitn/geoshop-dev-api python manage.py makemessages -l fr
```

Stop the server:
```powershell
docker stop geoshop
```

### Backend without docker on Windows

If not using docker, additionnal packages are required:

* pipenv (pip install pipenv)
* GDAL 2.4 (see instructions below to install it in your venv)

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
cd back
python manage.py migrate
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


## Upgrading front-end packages

Go to https://update.angular.io/?v=16.0-17.0 and check there are not manual steps to be done.

Then follow instructions. After upgrading, some packages will need to be upgraded according to angular version
you will be using. For instance, if you'll upgrade to version 17, you need to target version 17 for these packages:

```powershell
ng update @ngrx/store@17 angular-split@17
```

After, you can update other packages:

```powershell
ng update lodash-es rxjs tslib zone.js
```

Finally, update those related to OpenLayers:

```powershell
ng update ol ol-ext ol-geocoder proj4
```

Then all the front-end tests should be done.
