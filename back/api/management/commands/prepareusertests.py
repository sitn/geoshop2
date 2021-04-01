import os
from pathlib import Path
import datetime
from django.utils import timezone
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Polygon
from djmoney.money import Money
from api.models import Contact, Order, OrderItem, OrderType, Product, DataFormat
from api.helpers import _zip_them_all

UserModel = get_user_model()


class Command(BaseCommand):
    """
    This is a manage.py command that sets up basic objects allowing to proceed user tests.
    """
    def handle(self, *args, **options):
        # Set all ready orders to ARCHIVED
        orders_ready = Order.objects.filter(status=Order.OrderStatus.READY).all()
        for order in orders_ready:
            order.status = Order.OrderStatus.ARCHIVED
            order.save()

        # Create users
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
        rincevent.identity.save()

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
        mmi.identity.save()

        mma = UserModel.objects.create_user(
            username='mma', password='mma')
        mma.identity.email = 'mma-email@admin.com'
        mma.identity.first_name = 'Jean-René'
        mma.identity.last_name = 'Humbert-Droz L\'Authentique'
        mma.identity.street = 'Rue de Tivoli 22'
        mma.identity.postcode = '2000'
        mma.identity.city = 'Neuchâtel'
        mma.identity.country = 'Suisse'
        mma.identity.company_name = 'Service du Registre Foncier et de la Géomatique - SITN'
        mma.identity.phone = '+41 32 000 00 00'
        mma.identity.save()

        mka2 = UserModel.objects.create_user(
            username='mka2', password='mka2')
        mka2.identity.email = 'mka2-email@ne.ch'
        mka2.identity.first_name = 'Michaël'
        mka2.identity.last_name = 'Kalbermatten'
        mka2.identity.street = 'Rue de Tivoli 22'
        mka2.identity.postcode = '2000'
        mka2.identity.city = 'Neuchâtel'
        mka2.identity.country = 'Suisse'
        mka2.identity.company_name = 'Service du Registre Foncier et de la Géomatique - SITN'
        mka2.identity.phone = '+41 32 000 00 00'
        mka2.identity.subscribed = True
        mka2.identity.save()

        # contacts
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
        contact3 = Contact.objects.create(
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
        contact3.save()
        contact_mka2 = Contact.objects.create(
            first_name='Jean',
            last_name='Doe',
            email='test3@admin.com',
            postcode=2000,
            city='Lausanne',
            country='Suisse',
            company_name='Marine de Colombier',
            phone='+41 00 787 29 16',
            belongs_to=mka2
        )
        contact_mka2.save()

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

        # Create orders
        order1 = Order.objects.create(
            title='Plan de situation pour enquête',
            description='C\'est un test',
            order_type=order_type_prive,
            client=rincevent,
            geom=order_geom,
            invoice_reference='Dossier n°545454',
            date_ordered=timezone.now())
        order1.save()

        order2 = Order.objects.create(
            title='Plan de situation pour enquête',
            description='C\'est un test',
            order_type=order_type_prive,
            client=rincevent,
            geom=order_geom,
            invoice_reference='Dossier n°545454',
            date_ordered=timezone.now())
        order2.save()

        order3 = Order.objects.create(
            title='Plan de situation pour enquête',
            description='C\'est un test',
            order_type=order_type_prive,
            client=rincevent,
            geom=order_geom,
            invoice_reference='Dossier n°545454',
            date_ordered=timezone.now())
        order3.save()

        order4 = Order.objects.create(
            title='Plan de situation pour enquête',
            description='C\'est un test',
            order_type=order_type_prive,
            client=mma,
            geom=order_geom,
            invoice_reference='Dossier n°545454',
            date_ordered=timezone.now())
        order4.save()

        order_mka2 = Order.objects.create(
            title='Plan de situation pour enquête',
            description='C\'est un test',
            order_type=order_type_prive,
            client=mka2,
            geom=order_geom,
            invoice_reference='Dossier n°545454',
            date_ordered=timezone.now())
        order_mka2.save()

        order_download = Order.objects.create(
            title='Commande prête à être téléchargée',
            description='C\'est un test',
            order_type=order_type_prive,
            client=mmi,
            geom=order_geom,
            invoice_reference='Dossier 8',
            date_ordered=timezone.now())
        order_download.save()

        order_quoted = Order.objects.create(
            title='Commande devisée pour test',
            description='C\'est un test',
            order_type=order_type_prive,
            client=mmi,
            geom=order_geom,
            invoice_reference='Dossier n°545454',
            date_ordered=timezone.now())
        order_quoted.save()

        # Products
        product1 = Product.objects.filter(label='MO - Cadastre complet').first()
        product2 = Product.objects.filter(label='Maquette 3D').first()
        product_deprecated = Product.objects.filter(
            label='MO07 - Objets divers et éléments linéaires - linéaires').first()

        data_format = DataFormat.objects.filter(name='Geobat NE complet (DXF)').first()
        data_format_maquette = DataFormat.objects.filter(name='3dm (Fichier Rhino)').first()

        orderitems = [
            OrderItem.objects.create(order=order1, product=product1),
            OrderItem.objects.create(order=order1, product=product2),
            OrderItem.objects.create(order=order_download, product=product1),
            OrderItem.objects.create(order=order2, product=product1),
            OrderItem.objects.create(order=order3, product=product1, data_format=data_format),
            OrderItem.objects.create(order=order4, product=product2),
            OrderItem.objects.create(order=order_mka2, product=product1, data_format=data_format)
        ]
        for order_item in orderitems:
            order_item.set_price()
            order_item.save()
        order_item_deprecated = OrderItem.objects.create(
            order=order_mka2, product=product_deprecated, data_format=data_format)
        order_item_deprecated.set_price(price=Money(400, 'CHF'), base_fee=Money(150, 'CHF'))
        order_item_deprecated.price_status = OrderItem.PricingStatus.CALCULATED
        order_item_deprecated.save()

        order_item_download = OrderItem.objects.create(
            order=order_download, product=product2, data_format=data_format_maquette)
        order_item_download.set_price(price=Money(400, 'CHF'), base_fee=Money(150, 'CHF'))
        order_item_download.price_status = OrderItem.PricingStatus.CALCULATED
        order_item_download.save()

        order_item_quoted = OrderItem.objects.create(
            order=order_quoted, product=product2, data_format=data_format_maquette)
        order_item_quoted.set_price(price=Money(400, 'CHF'), base_fee=Money(150, 'CHF'))
        order_item_quoted.price_status = OrderItem.PricingStatus.CALCULATED
        order_item_quoted.save()

        order2.set_price()
        order2.save()

        order3.set_price()
        order3.confirm()
        order3.invoice_contact = contact1
        order3.save()

        order4.save()

        order_mka2.invoice_contact = contact_mka2
        order_mka2.set_price()
        order_mka2.date_ordered = datetime.datetime(2018, 12, 1, 8, 20, 3, 0, tzinfo=datetime.timezone.utc)
        order_mka2.status = Order.OrderStatus.ARCHIVED
        order_mka2.save()

        order_download.set_price()
        empty_zip_data = b'PK\x05\x06\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
        extract_file = SimpleUploadedFile("result.zip", empty_zip_data, content_type="multipart/form-data")
        for order_item in order_download.items.all():
            order_item.extract_result = extract_file
            order_item.status = OrderItem.OrderItemStatus.PROCESSED
            order_item.save()
        order_download.status = Order.OrderStatus.PROCESSED

        # Creating zip with all zips without background process unsupported by manage.py
        zip_list_path = list(order_download.items.all().values_list('extract_result', flat=True))
        today = timezone.now()
        zip_path = Path(
            'extract',
            str(today.year), str(today.month),
            "{}{}.zip".format('0a2ebb0a-', str(order_download.id)))
        order_download.extract_result.name = zip_path.as_posix()
        full_zip_path = Path(settings.MEDIA_ROOT, zip_path)
        _zip_them_all(full_zip_path, zip_list_path)
        order_download.save()

        order_quoted.set_price()
        order_quoted.quote_done()
        order_quoted.save()
