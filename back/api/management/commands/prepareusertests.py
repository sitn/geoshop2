from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Polygon
from api.models import Order, OrderItem, OrderType
import os

UserModel = get_user_model()


class Command(BaseCommand):
    def handle(self, *args, **options):
        rincevent = UserModel.objects.create_user(
            username='rincevent', password='rincevent')
        rincevent.identity.email = os.environ.get('EMAIL_TEST_TO', 'admin@admin.com')
        rincevent.save()
        mmi = UserModel.objects.create_user(
            username='mmi', password='mmi')
        mmi.identity.email = os.environ.get('EMAIL_TEST_TO_ARXIT', 'admin@admin.com')
        mmi.save()

        order_geom = Polygon((
            (
                2528577.8382161376,
                1193422.4003930448
            ),
            (
                2542482.6542869355,
                1193422.4329014618
            ),
            (
                2542482.568523701,
                1199018.36469272
            ),
            (
                2528577.807487005,
                1199018.324372703
            ),
            (
                2528577.8382161376,
                1193422.4003930448
            )
        ))

        order_type_prive = OrderType.objects.filter(name='Privé').first()
        order1 = Order.objects.create(
            title='Plan de situation pour enquête',
            order_type=order_type_prive,
            client=rincevent,
            geom=order_geom)
        order1.save()
