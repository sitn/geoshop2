from django.conf import settings
from django.contrib.gis.db import models
from django.contrib.auth.models import User
from django.contrib.postgres.search import SearchVectorField
from django.contrib.postgres.indexes import GinIndex, BTreeIndex
from django.utils.translation import gettext_lazy as _
from djmoney.models.fields import MoneyField
from .pricing import ProductPriceCalculator


class AbstractIdentity(models.Model):
    """
    Common properties for identities, addresses and temporary users
    """
    first_name = models.CharField(_('first_name'), max_length=30, blank=True)
    last_name = models.CharField(_('last_name'), max_length=150, blank=True)
    email = models.EmailField(_('email'), max_length=254, blank=True)
    street = models.CharField(_('street'), max_length=100, blank=True)
    street2 = models.CharField(_('street2'), max_length=100, blank=True)
    postcode = models.CharField(_('postcode'), max_length=10, blank=True)
    city = models.CharField(_('city'), max_length=50, blank=True)
    country = models.CharField(_('country'), max_length=50, blank=True)
    company_name = models.CharField(_('company_name'), max_length=100, blank=True)
    phone = models.CharField(_('phone'), max_length=50, blank=True)

    class Meta:
        abstract = True


class Contact(AbstractIdentity):
    """
    Address book of contacts linked to an user that stores addresses
    previously filled by the user.
    """
    belongs_to = models.OneToOneField(
        User, on_delete=models.DO_NOTHING, verbose_name=_('belongs_to'))

    class Meta:
        db_table = 'contact'
        verbose_name = _('contact')


class Copyright(models.Model):
    description = models.TextField(blank=True)

    class Meta:
        db_table = 'copyright'
        verbose_name = _('copyright')

    def __str__(self):
        return self.description


class Document(models.Model):
    """
    Named links to more informations on metadata
    """
    name = models.CharField(_('name'), max_length=80)
    link = models.URLField(
        _('link'),
        help_text=_('Please complete the above URL'),
        default=settings.DOCUMENT_BASE_URL
    )

    class Meta:
        db_table = 'document'
        verbose_name = _('document')

    def __str__(self):
        return self.name


class Format(models.Model):
    name = models.CharField(_('name'), max_length=100, blank=True)

    class Meta:
        db_table = 'format'
        verbose_name = _('format')

    def __str__(self):
        return self.name


class OrderType(models.Model):
    name = models.CharField(_('name'), max_length=30, blank=True)

    class Meta:
        db_table = 'order_type'
        verbose_name = _('order type')
        verbose_name_plural = _('order types')

    def __str__(self):
        return self.name


class Identity(AbstractIdentity):
    """
    All users have an Identity but not all identities are users.
    """
    user = models.OneToOneField(User, on_delete=models.DO_NOTHING, verbose_name=_('user'), blank=True, null=True)
    sap_id = models.BigIntegerField(_('sap_id'), null=True, blank=True)
    contract_accepted = models.DateField(_('contract_accepted'), null=True, blank=True)
    is_public = models.BooleanField(_('is_public'), default=False)

    class Meta:
        db_table = 'identity'
        verbose_name = _('identity')


class Metadata(models.Model):
    """
    Describes one or more Products. Every metadata can have one or more contact persons
    """
    id_name = models.CharField(_('id_name'), max_length=50, unique=True)
    name = models.CharField(_('name'), max_length=300, blank=True)
    description_short = models.CharField(_('description_short'), max_length=500, blank=True)
    description_long = models.TextField(_('description_long'), blank=True)
    scale = models.CharField(_('scale'), max_length=500, blank=True)
    geocat_link = models.CharField(_('geocat_link'), max_length=2000, blank=True)
    legend_link = models.CharField(_('legend_link'), max_length=2000, blank=True)
    image_link = models.CharField(_('image_link'), max_length=2000, blank=True)
    copyright = models.ForeignKey(Copyright, models.DO_NOTHING, verbose_name=_('copyright'), blank=True, null=True)
    documents = models.ManyToManyField(Document, verbose_name=_('documents'), blank=True)
    contact_persons = models.ManyToManyField(
        Identity,
        verbose_name=_('contact_persons'),
        related_name='contact_persons',
        through='MetadataContact')
    modified_date = models.DateTimeField(auto_now=True)
    modified_user = models.ForeignKey(
        User,
        models.DO_NOTHING,
        verbose_name=_('modified_user'),
        related_name='modified_user')

    class Meta:
        db_table = 'metadata'
        verbose_name = _('metadata')

    def __str__(self):
        return self.id_name


class MetadataContact(models.Model):
    """
    Links Metadata with the persons to contact (Identity) depending on the role they play for metadata.
    """
    metadata = models.ForeignKey(Metadata, models.DO_NOTHING, verbose_name=_('metadata'))
    contact_person = models.ForeignKey(Identity, models.DO_NOTHING, verbose_name=_('contact_person'))
    metadata_role = models.CharField(_('role'), max_length=150, blank=True)

    class Meta:
        db_table = 'metadata_contact_persons'
        verbose_name = _('metadata_contact')

    def __str__(self):
        return '%s - %s (%s)' % (self.contact_person, self.metadata, self.metadata_role)


class Pricing(models.Model):
    """
    Pricing for free products, single tax products or area priced products.
    For free products, set base_fee and unit_price both to 0.
    For unique price set base_fee to desired amount and unit_price to 0.
    For price based on area, provide unit_price
    For price base on a PricingArea, create the princing layer and link it to pricing_layer field.
    """
    class PricingType(models.TextChoices):
        FREE = 'FREE', _('Free')
        SINGLE = 'SINGLE', _('Single')
        BY_NUMBER_OBJECTS = 'BY_NUMBER_OBJECTS', _('By number of objects')
        BY_AREA = 'BY_AREA', _('By area')
        FROM_PRICING_LAYER = 'FROM_PRICING_LAYER', _('From a pricing layer')
        MANUAL = 'MANUAL', _('Manual')

    name = models.CharField(_('name'), max_length=100, default='pricing_name', null=True, blank=True)
    pricing_type = models.CharField(_('pricing_type'), max_length=30, choices=PricingType.choices)
    base_fee = MoneyField(_('base_fee'), max_digits=14, decimal_places=2, default_currency='CHF', null=True, blank=True)
    min_price = MoneyField(_('min_price'), max_digits=14, decimal_places=2, default_currency='CHF', null=True, blank=True)
    max_price = MoneyField(_('max_price'), max_digits=14, decimal_places=2, default_currency='CHF', null=True, blank=True)
    unit_price = MoneyField(_('unit_price'), max_digits=14, decimal_places=2, default_currency='CHF', null=True, blank=True)

    class Meta:
        db_table = 'pricing'
        verbose_name = _('pricing')

    def get_price(self, polygon):
        """
        Returns the price of a product given a polygon
        """
        price = ProductPriceCalculator.get_price(
            pricing_instance=self,
            polygon=polygon
        )

        if price is None:
            raise ValueError("Price has not been calculated")

        if self.min_price and price < self.min_price:
            return self.min_price
        if self.max_price and price > self.max_price:
            return self.max_price

        return price, self.base_fee

    def __str__(self):
        return '%s - %s' % (self.id, self.name)


class PricingArea(models.Model):
    """
    Areas defining prices must be grouped by name.
    """
    name = models.CharField(_('name'), max_length=300, null=True)
    unit_price = MoneyField(_('price'), max_digits=14, decimal_places=2, default_currency='CHF', null=True)
    geom = models.GeometryField(_('geom'), srid=2056)
    pricing = models.ForeignKey(Pricing, models.DO_NOTHING, verbose_name=_('pricing'), null=True)

    class Meta:
        db_table = 'pricing_layer'
        verbose_name = _('pricing_layer')
        indexes = (BTreeIndex(fields=('name',)),)

    def __str__(self):
        return self.name


class Product(models.Model):
    """
    A product is mostly a table or a raster. It can also be a group of products.

    Products with a PUBLISHED status are available in catalogue.
    A product with a status PUBLISHED_ONLY_IN_GROUP cannot be found on
    catalogue but can be ordered by the group he belongs to.

    Example:
    PFP3_categorie_1 and PFP3_categorie_2 have a PUBLISHED_ONLY_IN_GROUP status:
    they cannot be found as is in the catalogue, but they belong to another
    product (with group_id property): PFP3 that has a PUBLISHED status.
    """

    class ProductStatus(models.TextChoices):
        DRAFT = 'DRAFT', _('Draft')
        PUBLISHED = 'PUBLISHED', _('Published')
        PUBLISHED_ONLY_IN_GROUP = 'PUBLISHED_ONLY_IN_GROUP', _('Published only in group')
        DEPRECATED = 'DEPRECATED', _('Deprecated')

    metadata = models.ForeignKey(Metadata, models.DO_NOTHING, verbose_name=_('metadata'), blank=True, null=True)
    label = models.CharField(_('label'), max_length=250, blank=True)
    status = models.CharField(_('status'), max_length=30, choices=ProductStatus.choices, default=ProductStatus.DRAFT)
    group = models.ForeignKey('self', models.DO_NOTHING, verbose_name=_('group'), null=True)
    pricing = models.ForeignKey(Pricing, models.DO_NOTHING, verbose_name=_('pricing'))
    order = models.BigIntegerField(_('order'), blank=True, null=True)
    ts = SearchVectorField(null=True)

    class Meta:
        db_table = 'product'
        verbose_name = _('product')
        ordering = ['order']
        # https://www.postgresql.org/docs/10/gin-intro.html
        indexes = [GinIndex(fields=["ts"])]


    def __str__(self):
        return self.label


class Order(models.Model):
    """
    processing_fee should default to the maximum of base fees in the order but can then be edited mannually
    """

    class OrderStatus(models.TextChoices):
        DRAFT = 'DRAFT', _('Draft')
        PENDING = 'PENDING', _('Pending')
        READY = 'READY', _('Ready')
        PARTIALLY_DELIVERED = 'PARTIALLY_DELIVERED', _('Partially delivered')
        PROCESSED = 'PROCESSED', _('Processed')
        DOWNLOADED = 'DOWNLOADED', _('Downloaded')
        ARCHIVED = 'ARCHIVED', _('Archived')
        REJECTED = 'REJECTED', _('Rejected')

    title = models.CharField(_('title'), max_length=255)
    description = models.TextField(_('description'), blank=True)
    processing_fee = MoneyField(_('processing_fee'), max_digits=14, decimal_places=2, default_currency='CHF', blank=True, null=True)
    total_cost = MoneyField(_('total_cost'), max_digits=14, decimal_places=2, default_currency='CHF', blank=True, null=True)
    part_vat = MoneyField(_('part_vat'), max_digits=14, decimal_places=2, default_currency='CHF', blank=True, null=True)
    geom = models.PolygonField(_('geom'), srid=2056)
    client = models.ForeignKey(User, models.DO_NOTHING, verbose_name=_('client'), blank=True)
    order_contact = models.ForeignKey(
        Identity,
        models.DO_NOTHING,
        verbose_name=_('order_contact'),
        related_name='order_contact',
        blank=True,
        null=True)
    invoice_contact = models.ForeignKey(
        Identity,
        models.DO_NOTHING,
        verbose_name=_('invoice_contact'),
        related_name='invoice_contact',
        blank=True,
        null=True)
    invoice_reference = models.CharField(_('invoice_reference'), max_length=255, blank=True)
    order_type = models.ForeignKey(OrderType, models.DO_NOTHING, verbose_name=_('order_type'), blank=True, null=True)
    status = models.CharField(_('status'), max_length=20, choices=OrderStatus.choices, default=OrderStatus.DRAFT)
    date_ordered = models.DateTimeField(_('date_ordered'), blank=True, null=True)
    date_downloaded = models.DateTimeField(_('date_downloaded'), blank=True, null=True)
    date_processed = models.DateTimeField(_('date_processed'), blank=True, null=True)

    class Meta:
        db_table = 'order'
        ordering = ['-date_ordered']
        verbose_name = _('order')

    # TODO - REFACTOR THAT
    # Each time something is changed on an item
    # we should do something about the order invoice
    def get_price(self):
        self.items
        return 'gratuit'


    def __str__(self):
        return '%s - %s' % (self.id, self.title)


class OrderItem(models.Model):
    order = models.ForeignKey(Order, models.DO_NOTHING, related_name='items', verbose_name=_('order'), blank=True, null=True)
    product = models.ForeignKey(Product, models.DO_NOTHING, verbose_name=_('product'), blank=True, null=True)
    format = models.ForeignKey(Format, models.DO_NOTHING, verbose_name=_('format'), blank=True, null=True)
    last_download = models.DateTimeField(_('last_download'), blank=True, null=True)
    price = MoneyField(_('price'), max_digits=14, decimal_places=2, default_currency='CHF', null=True, blank=True)
    base_fee = MoneyField(_('base_fee'), max_digits=14, decimal_places=2, default_currency='CHF', null=True, blank=True)

    class Meta:
        db_table = 'order_item'
        verbose_name = _('order_item')

    def set_price(self):
        self.price, self.base_fee = self.product.pricing.get_price(self.order.geom)


class ProductField(models.Model):
    """
    Describes fields and their types of products.
    """

    class ProductFieldType(models.TextChoices):
        REAL = 'REAL', 'Real'
        DATE = 'DATE', 'Date'
        CHAR = 'CHAR', 'Character'
        VARCHAR = 'VARCHAR', 'Varying character'
        INT = 'INT', 'Integer'
        BIGINT = 'BIGINT', 'Big integer'
        FLOAT = 'FLOAT', 'Floating number'

    db_name = models.CharField(_('db_name'), max_length=50, blank=True)
    export_name = models.CharField(_('export_name'), max_length=50, blank=True)
    field_type = models.CharField(_('field_type'), max_length=10, choices=ProductFieldType.choices, blank=True)
    field_length = models.SmallIntegerField(_('field_length'), )
    product = models.ForeignKey(Product, verbose_name=_('product'), on_delete=models.CASCADE)


    class Meta:
        db_table = 'product_field'
        verbose_name = _('product_field')


class ProductValidation(models.Model):
    """
    Some products need to be validated before order is processed. The validation depends on the order type
    """
    product = models.ForeignKey(Product, models.DO_NOTHING, verbose_name=_('product'))
    order_type = models.ForeignKey(OrderType, models.DO_NOTHING, verbose_name=_('order_type'))
    validator = models.ForeignKey(Identity, models.DO_NOTHING, verbose_name=_('validator'))

    class Meta:
        db_table = 'product_validation'
        verbose_name = _('product_validation')


class ProductFormat(models.Model):
    product = models.ForeignKey(Product, models.DO_NOTHING, verbose_name=_('product'))
    format = models.ForeignKey(Format, models.DO_NOTHING, verbose_name=_('format'))
    is_manual = models.BooleanField(_('is_manual'), default=False) # extraction manuelle ou automatique

    class Meta:
        db_table = 'product_format'
        unique_together = (('product', 'format'),)
        verbose_name = _('product_format')


class UserChange(AbstractIdentity):
    """
    Stores temporary data in order to proceed user profile change requests.
    """

    class Meta:
        db_table = 'user_change'
        verbose_name = _('user_change')
