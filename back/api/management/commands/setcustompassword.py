import os
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model

UserModel = get_user_model()

class Command(BaseCommand):
    def handle(self, *args, **options):
        u = UserModel.objects.get(username='admin')
        u.set_password(os.environ.get('ADMIN_PASSWORD', 'admin'))
        u.save()
