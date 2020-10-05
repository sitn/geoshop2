import os
import copy
import datetime
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
        date_ordered=datetime.datetime.now())
    order1.save()
    product1 = Product.objects.filter(label='MO - Cadastre complet').first()
    data_format = DataFormat.objects.filter(name='Geobat NE complet (DXF)').first()
    orderitems = [
        OrderItem.objects.create(order=order1, product=product1, data_format=data_format),
    ]
    for order_item in orderitems:
        order_item.set_price()
        order_item.save()
    order1.set_price()
    order1.invoice_contact = mmi.identity
    order1.confirm()
    order1.save()
    return order1
