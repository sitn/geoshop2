import uuid
from django.contrib.gis.db import models
from django.contrib.auth.models import User
from djmoney.models.fields import MoneyField


class Copyright(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'copyright'


class Document(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=80, blank=True, null=True)
    link = models.CharField(max_length=2000, blank=True, null=True)

    class Meta:
        db_table = 'document'


class Format(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=30, blank=True, null=True)

    class Meta:
        db_table = 'format'

class OrderType(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=30, blank=True, null=True)


class Identity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firstname = models.CharField(max_length=50, blank=True, null=True)
    lastname = models.CharField(max_length=50, blank=True, null=True)
    street = models.CharField(max_length=100, blank=True, null=True)
    street2 = models.CharField(max_length=100, blank=True, null=True)
    postcode = models.PositiveIntegerField(blank=True, null=True)
    city = models.CharField(max_length=50, blank=True, null=True)
    country = models.CharField(max_length=50, blank=True, null=True)
    companyname = models.CharField(max_length=50, blank=True, null=True)
    phone = models.TextField(blank=True, null=True)
    sap_id = models.BigIntegerField(blank=True, null=True)
    contract_accepted = models.DateField(blank=True, null=True)

    class Meta:
        db_table = 'identity'


class Metadata(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, blank=True, null=True)
    description_short = models.CharField(max_length=500, blank=True, null=True)
    description_long = models.TextField(blank=True, null=True)
    geocat_link = models.CharField(max_length=2000, blank=True, null=True)
    legend_link = models.CharField(max_length=2000, blank=True, null=True)
    image_link = models.CharField(max_length=2000, blank=True, null=True)
    copyright = models.ForeignKey(Copyright, models.DO_NOTHING, blank=True, null=True)
    documents = models.ManyToManyField(Document, blank=True)
    contact_persons = models.ManyToManyField(Identity, blank=True)
    validations_needed = models.ManyToManyField(OrderType, blank=True)

    class Meta:
        db_table = 'metadata'


class Order(models.Model):
    """
    processing_fee should default to the maximum of base fees in the order but can then be edited mannually
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    processing_fee = MoneyField(max_digits=14, decimal_places=2, default_currency='CHF')
    total_cost = MoneyField(max_digits=14, decimal_places=2, default_currency='CHF')
    vat = models.DecimalField(max_digits=5, decimal_places=2, default=7.8)
    geom = models.PolygonField(srid=2056)
    client = models.ForeignKey(User, models.DO_NOTHING, blank=True, null=True)

    class Meta:
        db_table = 'order'


class OrderItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, models.DO_NOTHING, blank=True, null=True)
    product = models.ForeignKey('Product', models.DO_NOTHING, blank=True, null=True)
    format = models.ForeignKey(Format, models.DO_NOTHING, blank=True, null=True)
    last_download = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'orderitem'


class Pricing(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey('Product', models.DO_NOTHING, blank=True, null=True)
    price_type = models.CharField(max_length=50, blank=True, null=True)
    base_fee = MoneyField(max_digits=14, decimal_places=2, default_currency='CHF')
    price = MoneyField(max_digits=14, decimal_places=2, default_currency='CHF')

    class Meta:
        db_table = 'pricing'


class Product(models.Model):

    class ProductStatus(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        VALID = 'VALID', 'Valid'
        DEPRECATED = 'DEPRECATED', 'Deprecated'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    metadata = models.ForeignKey(Metadata, models.DO_NOTHING, blank=True, null=True)
    label = models.CharField(max_length=50, blank=True, null=True)
    status = models.CharField(max_length=10, choices=ProductStatus.choices, default=ProductStatus.DRAFT)
    is_published = models.BooleanField()
    group_id = models.ForeignKey('self', models.DO_NOTHING)

    class Meta:
        db_table = 'product'


class ProductFormat(models.Model):
    product = models.OneToOneField(Product, models.DO_NOTHING, primary_key=True)
    format = models.ForeignKey(Format, models.DO_NOTHING)
    is_manual = models.BooleanField() # extraction manuelle ou automatique

    class Meta:
        db_table = 'productformat'
        unique_together = (('product', 'format'),)
