# geoshop2

## Requirements

* PostgreSQL + PostGIS database
* Python > 3.6
* pipenv

## Getting started

### Database

User geoshop is assumed to be already created. Set up a database manually or with the provided script in `scripts/create_db.ps1` :

```sql
CREATE DATABASE geoshop;
CREATE EXTENSION postgis;
CREATE SCHEMA geoshop AUTHORIZATION geoshop;
```

### Backend

Fork and clone this repository. Make a copy of the `.env` file and adapt it to your environment settings:

```powershell
cp .env.sample .env
```

Install the app. If you want your `venv` to be inside your project directory, you need to set `PIPENV_VENV_IN_PROJECT` environment variable, otherwise it'll go to your profile:

```powershell
cd back
$env:PIPENV_VENV_IN_PROJECT="True"
pipenv install --dev           # installs everything needed
pipenv shell                   # activates venv and reads .env file
python manage.py migrate       # runs migrations
```

If you're starting with a fresh new database you'll need to create an user:

```powershell
python manage.py createsuperuser --email admin@example.com --username admin
```

Your database should be ready, now you can run the backend:

```powershell
python manage.py runserver
```

Translations can be generated with:

```powershell
python manage.py compilemessages
```
