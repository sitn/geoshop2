# Geoshop SITN

## Requirements

* PostgreSQL >= 11 + PostGIS
* Python >= 3.9

⚠️ This is a getting started for SITN instance. If you want to try geoshop, please follow:
 * the getting started here: https://github.com/sitn/geoshop-demo
 * or the tutorial here: https://camptocamp.github.io/geoshop/ 

## Getting started

Fork and clone this repository, then:

```powershell
git submodule init
git submodule update
cp .env.sample .env
cp back/default_settings.py back/settings.py
cp scripts/custom.js back/api/templates/gis/admin
```

adapt `.env` and `back/settings.py` to your needs.

### Database

Create a `geoshop` user if not existing yet, set your password according to your `env.local`:

```sql
CREATE ROLE geoshop WITH LOGIN PASSWORD <password>;
```

Then, set up a database:

```sql
CREATE DATABASE geoshop OWNER geoshop;
REVOKE ALL ON DATABASE geoshop FROM PUBLIC;
```

Then connect to the geoshop database and create extensions:

```sql
CREATE EXTENSION postgis;
CREATE EXTENSION unaccent;
CREATE EXTENSION "uuid-ossp";
CREATE SCHEMA geoshop AUTHORIZATION geoshop;

-- TODO: Only if french is needed
CREATE TEXT SEARCH CONFIGURATION fr (COPY = simple);
ALTER TEXT SEARCH CONFIGURATION fr ALTER MAPPING FOR hword, hword_part, word
WITH unaccent, simple;
```

Then, the best is to backup and restore a production db:

```powershell
.\scripts\1_fetch_prod_db.ps1
```

Now that the database is ready, you can start backend either with Docker or not.

### Backend with docker

To ease debug, you can add `DEBUG=True` to your `.env` file. Never add this to a container exposed on internet.

Run de docker composition with the following command and type `local` when asked:

```powershell
python deploy.py
```

You should be able to visit the API at http://localhost:5004 or another port if you changed it.

Run tests:

```powershell
docker compose exec api python manage.py test api
```

### Backend without docker on Windows

If not using docker, additional packages are required:

* GDAL (see instructions below to install it in your venv)
* pip install poetry

The `.env` should be moved inside the `geoshop-back` folder.

```powershell
mv .env geoshop-back
cd geoshop-back
```

Then you can install and activate poetry venv:

```powershell
poetry install --no-root
Invoke-Expression (poetry env activate)
```

#### Installing GDAL on Windows, only once per machine

You'll need to add GDAL dll to your PATH if you installed it system wide. You can get the dll path with:

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

Translations can be generated and static files collected with:

```powershell
python manage.py compilemessages --locale=fr
python manage.py collectstatic
```

```powershell
python manage.py runserver
```

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

Always:
1. Run tests locally on docker
2. Deploy prepub and test it with a fake order
3. Deploy prod

```powershell
python deploy.py
```

And choose your instance to be deployed. You must have `.env.prepub` and `.env.prod` defined at the root of the project.

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
