# Geoshop

## Requirements

* PostgreSQL >= 11 + PostGIS
* Python >= 3.9

## Getting started

Fork and clone this repository. Make a copy of the `.env.sample` and `back/default_settings.py` files and adapt it to your environment settings:

```powershell
git submodule init
git submodule update
cp .env.sample .env
cp back/default_settings.py back/settings.py
cp scripts/custom.js back/api/templates/gis/admin
```

### Database

The best is to backup and restore a production db:

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

If not using docker, additionnal packages are required:

* pipenv (pip install pipenv)
* GDAL (see instructions below to install it in your venv)

Install the app. If you want your `venv` to be inside your project directory, you need to set `PIPENV_VENV_IN_PROJECT` environment variable, otherwise it'll go to your profile

```powershell
$env:PIPENV_VENV_IN_PROJECT="True"
pipenv install --dev -r back/requirements.txt
pipenv shell # activates venv and reads .env file
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
