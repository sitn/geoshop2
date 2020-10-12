import os
import copy
from django.utils import timezone
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Polygon
from api.models import Contact, Order, OrderItem, OrderType, Product, DataFormat

UserModel = get_user_model()


class Command(BaseCommand):
    """
    This is a manage.py command that sets up basic objects allowing to proceed user tests.
    """
    def handle(self, *args, **options):
        rincevent = UserModel.objects.create_user(
            username='rincevent', password='rincevent')
        rincevent.identity.email = os.environ.get('EMAIL_TEST_TO', 'admin@admin.com')
        rincevent.identity.first_name = 'Jean'
        rincevent.identity.last_name = 'Michoud'
        rincevent.identity.street = 'Rue de Tivoli 22'
        rincevent.identity.postcode = '2000'
        rincevent.identity.city = 'Neuchâtel'
        rincevent.identity.country = 'Suisse'
        rincevent.identity.company_name = 'Service du Registre Foncier et de la Géomatique - SITN'
        rincevent.identity.phone = '+41 32 000 00 00'
        rincevent.save()
        mmi = UserModel.objects.create_user(
            username='mmi', password='mmi')
        mmi.identity.email = os.environ.get('EMAIL_TEST_TO_ARXIT', 'admin@admin.com')
        mmi.identity.first_name = 'Jeanne'
        mmi.identity.last_name = 'Paschoud'
        mmi.identity.street = 'Rue de Tivoli 22'
        mmi.identity.postcode = '2000'
        mmi.identity.city = 'Neuchâtel'
        mmi.identity.country = 'Suisse'
        mmi.identity.company_name = 'Service du Registre Foncier et de la Géomatique - SITN'
        mmi.identity.phone = '+41 32 000 00 00'
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
            description='C\'est un test',
            order_type=order_type_prive,
            client=rincevent,
            geom=order_geom,
            invoice_reference='Dossier n°545454',
            date_ordered=timezone.now())
        order1.save()
        order2 = copy.copy(order1)
        order2.pk = None
        order3 = copy.copy(order2)
        order2.save()
        order3.save()
        product1 = Product.objects.filter(label='MO - Cadastre complet').first()
        product2 = Product.objects.filter(label='Maquette 3D').first()
        data_format = DataFormat.objects.filter(name='Geobat NE complet (DXF)').first()
        orderitems = [
            OrderItem.objects.create(order=order1, product=product1),
            OrderItem.objects.create(order=order1, product=product2),
            OrderItem.objects.create(order=order2, product=product1),
            OrderItem.objects.create(order=order3, product=product1, data_format=data_format)
        ]
        for order_item in orderitems:
            order_item.set_price()
            order_item.save()
        order2.set_price()
        order2.save()
        order3.set_price()
        order3.confirm()
        order3.invoice_contact = mmi.identity
        order3.save()
