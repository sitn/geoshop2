import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from api.models import Order

UserModel = get_user_model()

class Command(BaseCommand):
    """
    Needs to be called once after database is reset.
    Sets .env ADMIN_PASSWORD
    Creates extract user and group
    Creates internal group
    """
    def handle(self, *args, **options):
        admin_user = UserModel.objects.get(username='admin')
        admin_user.set_password(os.environ['ADMIN_PASSWORD'])
        admin_user.save()

        content_type = ContentType.objects.get_for_model(Order)
        extract_group = Group.objects.create(name='extract')
        Group.objects.create(name='internal')
        extract_permission = Permission.objects.create(
            codename='is_extract',
            name='Is extract service',
            content_type=content_type)
        extract_permission.save()

        extract_user = UserModel.objects.create_user(
            username='sitn_extract', password=os.environ['EXTRACT_USER_PASSWORD'])
        extract_group.permissions.add(extract_permission)
        extract_group.save()
        extract_user.groups.add(extract_group)
        extract_user.save()
