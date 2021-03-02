from django.utils import timezone
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Polygon
from api.models import Contact, Order, OrderItem, OrderType, Product, DataFormat

UserModel = get_user_model()

def generate_fake_order():
    rincevent = UserModel.objects.get(username='rincevent')
    mmi = UserModel.objects.get(username='mmi')
    contact1 = Contact.objects.filter(last_name='Riedo').first()
    contact2 = Contact.objects.filter(last_name='Rieda').first()
    order_geom1 = Polygon((
        (2528577.8382161376, 1193422.4003930448),
        (2542482.6542869355, 1193422.4329014618),
        (2542482.568523701, 1199018.36469272),
        (2528577.807487005, 1199018.324372703),
        (2528577.8382161376, 1193422.4003930448)
    ))
    order_geom2 = Polygon((
        (2540000, 1203000),
        (2540000, 1203000),
        (2550000, 1213000),
        (2560000, 1203000),
        (2540000, 1203000)
    ))

    order_type_prive = OrderType.objects.filter(name='Privé').first()
    order1 = Order.objects.create(
        title='Plan de situation pour enquête',
        description='C\'est un test',
        order_type=order_type_prive,
        client=rincevent,
        geom=order_geom1,
        invoice_reference='Dossier n°545454',
        date_ordered=timezone.now())
    order2 = Order.objects.create(
        title='Rendu 3D',
        description='C\'est un aussi test',
        order_type=order_type_prive,
        client=mmi,
        geom=order_geom1,
        invoice_contact=contact1,
        invoice_reference='28',
        date_ordered=timezone.now())
    orders = [order1, order2]
    product1 = Product.objects.filter(label='MO - Cadastre complet').first()
    product2 = Product.objects.filter(label='Bâtiment 3D').first()
    data_format1 = DataFormat.objects.filter(name='Geobat NE complet (DXF)').first()
    data_format2 = DataFormat.objects.filter(name='3dm (Fichier Rhino)').first()
    orderitems = [
        OrderItem.objects.create(order=order1, product=product1, data_format=data_format1),
        OrderItem.objects.create(order=order2, product=product1, data_format=data_format1),
        OrderItem.objects.create(order=order2, product=product2, data_format=data_format2),
    ]
    for order_item in orderitems:
        order_item.set_price()
        order_item.save()
    for order in orders:
        order.set_price()
        order.confirm()
        order.save()
