import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Polygon
from api.models import Contact, Order, OrderItem, OrderType, Product

UserModel = get_user_model()


class Command(BaseCommand):
    """
    This is a manage.py command that sets up basic objects allowing to proceed user tests.
    """
    def handle(self, *args, **options):
        rincevent = UserModel.objects.create_user(
            username='rincevent', password='rincevent')
        rincevent.identity.email = os.environ.get('EMAIL_TEST_TO', 'admin@admin.com')
        rincevent.save()
        mmi = UserModel.objects.create_user(
            username='mmi', password='mmi')
        mmi.identity.email = os.environ.get('EMAIL_TEST_TO_ARXIT', 'admin@admin.com')
        mmi.save()

        contact1 = Contact.objects.create(
            first_name='Marc',
            last_name='Riedo',
            email='test@admin.com',
            postcode=2000,
            city='Neuchâtel',
            country='Suisse',
            company_name='SITN',
            phone='+41 00 787 45 15',
            belongs_to=mmi
        )
        contact1.save()

        contact2 = Contact.objects.create(
            first_name='Marcelle',
            last_name='Rieda',
            email='test2@admin.com',
            postcode=2000,
            city='Neuchâtel',
            country='Suisse',
            company_name='SITN',
            phone='+41 00 787 45 16',
            belongs_to=mmi
        )
        contact2.save()

        contact2 = Contact.objects.create(
            first_name='Jean',
            last_name='Doe',
            email='test3@admin.com',
            postcode=2000,
            city='Lausanne',
            country='Suisse',
            company_name='Marine de Colombier',
            phone='+41 00 787 29 16',
            belongs_to=mmi
        )
        contact2.save()

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
            description='C''est un test',
            order_type=order_type_prive,
            client=rincevent,
            geom=order_geom)
        order1.save()
        product1 = Product.objects.filter(label='MO - Cadastre complet').first()
        product2 = Product.objects.filter(label='Maquette 3D').first()
        orderitems = [
            OrderItem.objects.create(order=order1, product=product1),
            OrderItem.objects.create(order=order1, product=product2)
        ]
        for order_item in orderitems:
            order_item.save()
