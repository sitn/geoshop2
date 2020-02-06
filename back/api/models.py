import uuid
from django.db import models
from django.contrib.gis.db import models
from django.contrib.auth.models import User
from djmoney.models.fields import MoneyField


class Copyright(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    description = models.TextField(blank=True, null=True)


class Document(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.TextField(blank=True, null=True)
    link = models.TextField(blank=True, null=True)


class Format(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.TextField(blank=True, null=True)


class Identity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firstname = models.TextField(blank=True, null=True)
    lastname = models.TextField(blank=True, null=True)
    street = models.TextField(blank=True, null=True)
    street2 = models.TextField(blank=True, null=True)
    postcode = models.SmallIntegerField(blank=True, null=True)
    city = models.TextField(blank=True, null=True)
    country = models.TextField(blank=True, null=True)
    companyname = models.TextField(blank=True, null=True)
    phone = models.TextField(blank=True, null=True)
    sap_id = models.BigIntegerField(blank=True, null=True)
    contract_accepted = models.DateField(blank=True, null=True)


class Metadata(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.TextField(blank=True, null=True)
    description_short = models.TextField(blank=True, null=True)
    description_long = models.TextField(blank=True, null=True)
    geocat_link = models.TextField(blank=True, null=True)
    legend_link = models.TextField(blank=True, null=True)
    image_link = models.TextField(blank=True, null=True)
    copyright = models.ForeignKey(Copyright, models.DO_NOTHING, blank=True, null=True)
    documents = models.ManyToManyField(Document, blank=True)
    contact_persons = models.ManyToManyField(Identity, blank=True)


class Order(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    total_cost = MoneyField(max_digits=14, decimal_places=2, default_currency='CHF')
    vat = models.DecimalField(max_digits=5, decimal_places=2, default=7.8)
    geom = models.PolygonField(srid=2056)
    client = models.ForeignKey(User, models.DO_NOTHING, blank=True, null=True)


class OrderItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, models.DO_NOTHING, blank=True, null=True)
    product = models.ForeignKey('Product', models.DO_NOTHING, blank=True, null=True)
    format = models.ForeignKey(Format, models.DO_NOTHING, blank=True, null=True)
    last_download = models.DateTimeField(blank=True, null=True)


class Pricing(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey('Product', models.DO_NOTHING, blank=True, null=True)
    type = models.TextField(blank=True, null=True)
    base_fee = MoneyField(max_digits=14, decimal_places=2, default_currency='CHF')
    price = MoneyField(max_digits=14, decimal_places=2, default_currency='CHF')


class Product(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    metadata = models.ForeignKey(Metadata, models.DO_NOTHING, blank=True, null=True)
    label = models.TextField(blank=True, null=True)
    status = models.TextField(blank=True, null=True)  # This field type is a guess.
    is_published = models.BooleanField()
    is_group = models.BooleanField()


class ProductFormat(models.Model):
    product = models.OneToOneField(Product, models.DO_NOTHING, primary_key=True)
    format = models.ForeignKey(Format, models.DO_NOTHING)
    availability = models.TextField(blank=True, null=True)  # This field type is a guess.

    class Meta:
        unique_together = (('product', 'format'),)


class ProductGroup(models.Model):
    product_id_parent = models.OneToOneField(
        Product,
        models.DO_NOTHING,
        db_column='product_id_parent',
        primary_key=True,
        related_name='product_group_parent')
    product_id_child = models.ForeignKey(
        Product,
        models.DO_NOTHING,
        db_column='product_id_child',
        related_name='product_group_child')

    class Meta:
        unique_together = (('product_id_parent', 'product_id_child'),)
