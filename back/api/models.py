import logging
import secrets
import uuid
from django.conf import settings
from django.core.validators import RegexValidator
from django.contrib.gis.db import models
from django.contrib.gis.geos import Polygon
from django.contrib.auth import get_user_model
from django.contrib.postgres.search import SearchVectorField
from django.contrib.postgres.indexes import GinIndex, BTreeIndex
from django.utils import timezone
from django.utils.html import mark_safe
from django.utils.translation import gettext_lazy as _
from django.urls import reverse
from djmoney.money import Money
from djmoney.models.fields import MoneyField

from .pricing import ProductPriceCalculator
from .helpers import RandomFileName, send_geoshop_email

LOGGER = logging.getLogger(__name__)
# Get the UserModel
UserModel = get_user_model()


class AbstractIdentity(models.Model):
    """
    Common properties for identities, addresses and temporary users
    """
    first_name = models.CharField(_('first_name'), max_length=50, blank=True)
    last_name = models.CharField(_('last_name'), max_length=150, blank=True)
    email = models.EmailField(_('email'), max_length=254, blank=True)
    street = models.CharField(_('street'), max_length=100, blank=True)
    street2 = models.CharField(_('street2'), max_length=100, blank=True)
    postcode = models.CharField(_('postcode'), max_length=10, blank=True)
    city = models.CharField(_('city'), max_length=50, blank=True)
    country = models.CharField(_('country'), max_length=50, blank=True)
    company_name = models.CharField(
        _('company_name'), max_length=250, blank=True)
    phone = models.CharField(_('phone'), max_length=50, blank=True)

    class Meta:
        abstract = True

    def __str__(self):
        if self.company_name:
            return '%s %s (%s)' % (self.last_name, self.first_name, self.company_name)
        return '%s %s' % (self.last_name, self.first_name)


class Contact(AbstractIdentity):
    """
    Address book of contacts linked to an user that stores addresses
    previously filled by the user.
    """
    belongs_to = models.ForeignKey(
        UserModel, on_delete=models.CASCADE, verbose_name=_('belongs_to'))
    sap_id = models.BigIntegerField(_('sap_id'), null=True, blank=True)
    subscribed = models.BooleanField(_('subscribed'), default=False)
    is_active = models.BooleanField(_('is_active'), default=True)

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
        default='https://sitn.ne.ch',
        max_length=2000
    )

    class Meta:
        db_table = 'document'
        verbose_name = _('document')

    def __str__(self):
        return '%s (%s)' % (self.name, self.link.split("/")[-1])


class DataFormat(models.Model):
    name = models.CharField(_('name'), max_length=100, blank=True)

    class Meta:
        db_table = 'data_format'
        verbose_name = _('data_format')

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
    user = models.OneToOneField(
        UserModel, on_delete=models.SET_NULL, verbose_name=_('user'), blank=True, null=True)
    sap_id = models.BigIntegerField(_('sap_id'), null=True, blank=True)
    ide_id = models.CharField(_('ide_number'), max_length=15, null=True, blank=True, validators=[
        RegexValidator(
            regex=r'^CHE-([0-9]{3}\.){2}[0-9]{3}$',
            message=_('IDE number is not valid'),
        ),
    ])
    contract_accepted = models.DateField(_('contract_accepted'), null=True, blank=True)
    is_public = models.BooleanField(_('is_public'), default=False)
    subscribed = models.BooleanField(_('subscribed'), default=False)
    birthday = models.DateField(_('birthday'), null=True, blank=True)

    class Meta:
        db_table = 'identity'
        verbose_name = _('identity')


class Metadata(models.Model):
    """
    Describes one or more Products. Every metadata can have one or more contact persons
    """

    class MetadataAccessibility(models.TextChoices):
        PUBLIC = 'PUBLIC', _('Public')
        APPROVAL_NEEDED = 'APPROVAL_NEEDED', _('Approval needed')
        PRIVATE = 'PRIVATE', _('Private')

    id_name = models.CharField(_('id_name'), max_length=50, unique=True)
    name = models.CharField(_('name'), max_length=300, blank=True)
    description_long = models.TextField(_('description_long'), blank=True)
    datasource = models.CharField(_('datasource'), max_length=260, blank=True, null=True)
    accessibility = models.CharField(
        _('accessibility'), max_length=30,
        choices=MetadataAccessibility.choices,
        default=MetadataAccessibility.PUBLIC
    )
    scale = models.CharField(_('scale'), max_length=500, blank=True)
    geocat_link = models.CharField(_('geocat_link'), max_length=2000, blank=True)
    legend_link = models.CharField(_('legend_link'), max_length=2000, blank=True)
    image_link = models.CharField(_('image_link'), max_length=250, default=settings.DEFAULT_METADATA_IMAGE_URL, blank=True)
    copyright = models.ForeignKey(
        Copyright, models.SET_NULL, verbose_name=_('copyright'), blank=True, null=True)
    documents = models.ManyToManyField(Document, verbose_name=_('documents'), blank=True)
    contact_persons = models.ManyToManyField(
        Identity,
        verbose_name=_('contact_persons'),
        related_name='contact_persons',
        through='MetadataContact')
    modified_date = models.DateTimeField(auto_now=True)
    modified_user = models.ForeignKey(
        UserModel,
        models.PROTECT,
        verbose_name=_('modified_user'),
        related_name='modified_user')

    class Meta:
        db_table = 'metadata'
        verbose_name = _('metadata')

    def __str__(self):
        return self.id_name

    def get_legend_link(self):
        if self.legend_link is None or self.legend_link == '':
            return None
        # When legend_link is 0, returns legend from mapserver
        if self.legend_link == '0':
            return settings.AUTO_LEGEND_URL + self.id_name
        # When legend_link is intra, returns legend from intranet mapserver
        if self.legend_link == 'intra':
            return settings.INTRA_LEGEND_URL + self.id_name
        if self.legend_link.startswith('http'):
            return self.legend_link
        return settings.MEDIA_URL + self.legend_link

    def legend_tag(self):
        if self.get_legend_link():
            return mark_safe('<img src="%s" />' % self.get_legend_link())
    legend_tag.short_description = _('legend')

    def image_tag(self):
        if self.image_link is None or self.image_link == '':
            return mark_safe('<img src="%s%s" />' % (settings.MEDIA_URL, 'no_image.jpg'))
        return mark_safe('<img src="%s%s" />' % (settings.MEDIA_URL, self.image_link))
    image_tag.short_description = _('image')


class MetadataContact(models.Model):
    """
    Links Metadata with the persons to contact (Identity) depending on the role they play for metadata.
    """
    metadata = models.ForeignKey(Metadata, models.CASCADE, verbose_name=_('metadata'))
    contact_person = models.ForeignKey(
        Identity, models.CASCADE, verbose_name=_('contact_person'), limit_choices_to={'is_public': True})
    metadata_role = models.CharField(_('role'), max_length=150, default='Gestionnaire')
    is_validator = models.BooleanField(_('is_validator'), default=False)

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
    For prices based on a PricingGeometry, create the pricing layer and 
    link it to pricing_layer field.
    """
    class PricingType(models.TextChoices):
        FREE = 'FREE', _('Free')
        SINGLE = 'SINGLE', _('Single')
        BY_NUMBER_OBJECTS = 'BY_NUMBER_OBJECTS', _('By number of objects')
        BY_AREA = 'BY_AREA', _('By area')
        FROM_PRICING_LAYER = 'FROM_PRICING_LAYER', _('From a pricing layer')
        FROM_CHILDREN_OF_GROUP = 'FROM_CHILDREN_OF_GROUP', _('From children products of this group')
        MANUAL = 'MANUAL', _('Manual')

    name = models.CharField(_('name'), max_length=100, null=True, blank=True)
    pricing_type = models.CharField(
        _('pricing_type'), max_length=30, choices=PricingType.choices)
    base_fee = MoneyField(
        _('base_fee'), max_digits=14, decimal_places=2, default_currency='CHF', null=True, blank=True)
    min_price = MoneyField(
        _('min_price'), max_digits=14, decimal_places=2, default_currency='CHF', null=True, blank=True)
    max_price = MoneyField(
        _('max_price'), max_digits=14, decimal_places=2, default_currency='CHF', null=True, blank=True)
    unit_price = MoneyField(
        _('unit_price'), max_digits=14, decimal_places=2, default_currency='CHF', null=True, blank=True)

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
            return None, None

        if self.min_price and price < self.min_price:
            return self.min_price, self.base_fee

        # if max_price is reached, will force customer ask for a quote
        if self.max_price and price > self.max_price:
            return None, None

        return price, self.base_fee

    def __str__(self):
        return '%s + %s CHF de taxe' % (self.name, self.base_fee)


class PricingGeometry(models.Model):
    """
    Areas defining prices must be grouped by name.
    """
    name = models.CharField(_('name'), max_length=300, null=True)
    unit_price = MoneyField(
        _('price'), max_digits=14, decimal_places=2, default_currency='CHF', null=True)
    geom = models.GeometryField(_('geom'), srid=settings.DEFAULT_SRID)
    pricing = models.ForeignKey(Pricing, models.CASCADE, verbose_name=_('pricing'), null=True)

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

    metadata = models.ForeignKey(
        Metadata, models.PROTECT, verbose_name=_('metadata'))
    label = models.CharField(_('label'), max_length=250, unique=True, validators=[
        RegexValidator(
            regex=r'^[^<>%$"\(\)\n\r]*$',
            message=_('Label contains forbidden characters'),
        ),
    ])
    status = models.CharField(
        _('status'), max_length=30, choices=ProductStatus.choices, default=ProductStatus.DRAFT)
    group = models.ForeignKey(
        'self', models.SET_NULL, verbose_name=_('group'), blank=True, null=True, related_name='products')
    provider = models.ForeignKey(
        UserModel, models.PROTECT, verbose_name=_('provider'), null=True,
        limit_choices_to={
            'groups__name': 'extract'
        })
    pricing = models.ForeignKey(Pricing, models.PROTECT, verbose_name=_('pricing'))
    free_when_subscribed = models.BooleanField(_('free_when_subscribed'), default=False)
    order = models.BigIntegerField(_('order_index'), blank=True, null=True)
    thumbnail_link = models.CharField(
        _('thumbnail_link'), max_length=250, default=settings.DEFAULT_PRODUCT_THUMBNAIL_URL)
    ts = SearchVectorField(null=True)
    geom = models.PolygonField(_('geom'), srid=settings.DEFAULT_SRID, default=Polygon.from_bbox(
        (2519900, 1186430, 2578200, 1227030)
    ))

    class Meta:
        db_table = 'product'
        verbose_name = _('product')
        ordering = ['order']
        # https://www.postgresql.org/docs/10/gin-intro.html
        indexes = [GinIndex(fields=["ts"])]

    def __str__(self):
        return self.label

    def thumbnail_tag(self):
        if self.thumbnail_link is None or self.thumbnail_link == '':
            return mark_safe('<img src="%s%s" />' % (settings.MEDIA_URL, 'no_image.jpg'))
        return mark_safe('<img src="%s%s" />' % (settings.MEDIA_URL, self.thumbnail_link))
    thumbnail_tag.short_description = _('thumbnail')


class Order(models.Model):
    """
    processing_fee should default to the maximum of base fees in the order but can then be edited mannually
    """

    class OrderStatus(models.TextChoices):
        DRAFT = 'DRAFT', _('Draft')
        PENDING = 'PENDING', _('Pending')
        QUOTE_DONE = 'QUOTE_DONE', _('Quote done')
        READY = 'READY', _('Ready')
        IN_EXTRACT = 'IN_EXTRACT', _('In extract')
        PARTIALLY_DELIVERED = 'PARTIALLY_DELIVERED', _('Partially delivered')
        PROCESSED = 'PROCESSED', _('Processed')
        ARCHIVED = 'ARCHIVED', _('Archived')
        REJECTED = 'REJECTED', _('Rejected')

    title = models.CharField(_('title'), max_length=255, validators=[
        RegexValidator(
            regex=r'^[^<>%$"\(\)\n\r]*$',
            message=_('Title contains forbidden characters'),
        ),
    ])
    description = models.TextField(_('description'), blank=True)
    processing_fee = MoneyField(
        _('processing_fee'), max_digits=14, decimal_places=2, default_currency='CHF', blank=True, null=True)
    total_without_vat = MoneyField(
        _('total_without_vat'), max_digits=14, decimal_places=2, default_currency='CHF', blank=True, null=True)
    part_vat = MoneyField(
        _('part_vat'), max_digits=14, decimal_places=2, default_currency='CHF', blank=True, null=True)
    total_with_vat = MoneyField(
        _('total_with_vat'), max_digits=14, decimal_places=2, default_currency='CHF', blank=True, null=True)
    geom = models.PolygonField(_('geom'), srid=settings.DEFAULT_SRID)
    client = models.ForeignKey(UserModel, models.PROTECT, verbose_name=_('client'), blank=True)
    invoice_contact = models.ForeignKey(
        Contact,
        models.PROTECT,
        verbose_name=_('invoice_contact'),
        related_name='invoice_contact',
        blank=True,
        null=True
    )
    invoice_reference = models.CharField(_('invoice_reference'), max_length=255, blank=True)
    email_deliver = models.EmailField(_('email_deliver'), max_length=254, blank=True, null=True)
    order_type = models.ForeignKey(OrderType, models.PROTECT, verbose_name=_('order_type'))
    status = models.CharField(
        _('status'), max_length=20, choices=OrderStatus.choices, default=OrderStatus.DRAFT)
    date_ordered = models.DateTimeField(_('date_ordered'), blank=True, null=True)
    date_downloaded = models.DateTimeField(_('date_downloaded'), blank=True, null=True)
    date_processed = models.DateTimeField(_('date_processed'), blank=True, null=True)
    extract_result = models.FileField(upload_to='extract', null=True, blank=True)
    download_guid = models.UUIDField(_('download_guid'), null=True, blank=True)

    class Meta:
        db_table = 'order'
        ordering = ['-date_ordered']
        verbose_name = _('order')

    def _reset_prices(self):
        self.processing_fee = None
        self.total_without_vat = None
        self.part_vat = None
        self.total_with_vat = None

    def set_price(self):
        """
        Sets price information if all items have prices
        """
        self._reset_prices()
        items = self.items.all()
        if items == []:
            return False
        self.total_without_vat = Money(0, 'CHF')
        self.processing_fee = Money(0, 'CHF')
        for item in items:
            if item.base_fee is None:
                self._reset_prices()
                return False
            if item.base_fee > self.processing_fee:
                self.processing_fee = item.base_fee
            self.total_without_vat += item.price
        self.total_without_vat += self.processing_fee
        self.part_vat = self.total_without_vat * settings.VAT
        self.total_with_vat = self.total_without_vat + self.part_vat
        return True

    def quote_done(self):
        """Admins confirmation they have given a manual price"""
        price_is_set = self.set_price()
        if price_is_set:
            self.status = self.OrderStatus.QUOTE_DONE
            self.save()
            send_geoshop_email(
                _('Geoshop - Quote has been done'),
                recipient=self.email_deliver or self.client.identity,
                template_name='email_quote_done',
                template_data={
                    'order_id': self.id,
                    'first_name': self.client.identity.first_name,
                    'last_name': self.client.identity.last_name
                }
            )
        return price_is_set

    def _expand_product_groups(self):
        """
        When a product is a group of products, the group is deleted from cart and
        is replaced with one OrderItem for each product inside the group.
        """
        items = self.items.all()
        for item in items:
            # if product is a group (if product has children)
            if item.product.products.exists():
                for product in item.product.products.all():
                    # only pick products that intersect current order geom
                    if product.geom.intersects(self.geom):
                        new_item = OrderItem(
                            order=self,
                            product=product,
                            data_format=item.data_format
                        )
                        # If the data format for the group is not available for the item,
                        # pick the first possible
                        if item.data_format not in item.available_formats:
                            new_item.data_format = product.product_formats.all().first().data_format
                        new_item.set_price()
                        new_item.save()
                item.delete()

    def confirm(self):
        """Customer's confirmations he wants to proceed with the order"""
        self._expand_product_groups()
        items = self.items.all()
        has_all_prices_calculated = True
        for item in items:
            if item.price_status == OrderItem.PricingStatus.PENDING:
                item.ask_price()
                has_all_prices_calculated = has_all_prices_calculated and False
            if item.product.metadata.accessibility == Metadata.MetadataAccessibility.APPROVAL_NEEDED:
                item.ask_validation()
                item.save()
        if has_all_prices_calculated:
            self.date_ordered = timezone.now()
            self.download_guid = uuid.uuid4()
            self.status = Order.OrderStatus.READY
        else:
            self.status = Order.OrderStatus.PENDING

    def next_status_on_extract_input(self):
        """Controls status when Extract uploads a file or cancel an order item"""
        previous_accepted_status = [
            Order.OrderStatus.READY,
            Order.OrderStatus.IN_EXTRACT,
            Order.OrderStatus.PARTIALLY_DELIVERED
        ]
        if self.status not in previous_accepted_status:
            raise Exception("Order has an inappropriate status after input")
        items_statuses = set(self.items.all().values_list('status', flat=True))

        if OrderItem.OrderItemStatus.IN_EXTRACT in items_statuses:
            if OrderItem.OrderItemStatus.PROCESSED in items_statuses:
                self.status = Order.OrderStatus.PARTIALLY_DELIVERED
            else:
                self.status = Order.OrderStatus.READY
        else:
            if OrderItem.OrderItemStatus.PROCESSED in items_statuses:
                self.status = Order.OrderStatus.PROCESSED
                self.date_processed = timezone.now()
                send_geoshop_email(
                    _('Geoshop - Download ready'),
                    recipient=self.email_deliver or self.client.identity,
                    template_name='email_download_ready',
                    template_data={
                        'order_id': self.id,
                        'download_guid': self.download_guid,
                        'front_url': '{}://{}{}'.format(
                            settings.FRONT_PROTOCOL,
                            settings.FRONT_URL,
                            settings.FRONT_HREF
                            ),
                        'first_name': self.client.identity.first_name,
                        'last_name': self.client.identity.last_name,
                    }
                )
            else:
                self.status = Order.OrderStatus.REJECTED
        return self.status

    @property
    def geom_srid(self):
        return self.geom.srid

    @property
    def geom_area(self):
        return self.geom.area

    def __str__(self):
        return '%s - %s' % (self.id, self.title)


class OrderItem(models.Model):
    """
    Cart item.
    """

    class PricingStatus(models.TextChoices):
        PENDING = 'PENDING', _('Pending')
        CALCULATED = 'CALCULATED', _('Calculated')
        IMPORTED = 'IMPORTED', _('Imported')  # from old database

    class OrderItemStatus(models.TextChoices):
        VALIDATION_PENDING = 'VALIDATION_PENDING', _('Validation pending')
        PENDING = 'PENDING', _('Pending')
        IN_EXTRACT = 'IN_EXTRACT', _('In extract')
        PROCESSED = 'PROCESSED', _('Processed')
        ARCHIVED = 'ARCHIVED', _('Archived')
        REJECTED = 'REJECTED', _('Rejected')

    order = models.ForeignKey(
        Order, models.CASCADE, related_name='items', verbose_name=_('order'), blank=True, null=True)
    product = models.ForeignKey(
        Product, models.PROTECT, verbose_name=_('product'), blank=True, null=True)
    data_format = models.ForeignKey(
        DataFormat, models.PROTECT, verbose_name=_('data_format'), blank=True, null=True)
    srid = models.IntegerField(_('srid'), default=settings.DEFAULT_SRID)
    last_download = models.DateTimeField(_('last_download'), blank=True, null=True)
    validation_date = models.DateTimeField(_('validation_date'), blank=True, null=True)
    price_status = models.CharField(
        _('price_status'), max_length=20, choices=PricingStatus.choices, default=PricingStatus.PENDING)
    status = models.CharField(
        _('status'), max_length=20, choices=OrderItemStatus.choices, default=OrderItemStatus.PENDING)
    _price = MoneyField(
        _('price'), max_digits=14, decimal_places=2, default_currency='CHF', null=True, blank=True)
    _base_fee = MoneyField(
        _('base_fee'), max_digits=14, decimal_places=2, default_currency='CHF', null=True, blank=True)
    extract_result = models.FileField(upload_to=RandomFileName('extract'), null=True, blank=True)
    comment = models.TextField(_('comment'), null=True, blank=True)
    token = models.CharField(_('token'), max_length=256, null=True, blank=True)


    class Meta:
        db_table = 'order_item'
        verbose_name = _('order_item')

    @property
    def available_formats(self):
        queryset = ProductFormat.objects.filter(
            product=self.product).values_list('data_format__name', flat=True)
        return list(queryset)

    def _get_price_values(self, price_value):
        if self.price_status == OrderItem.PricingStatus.PENDING:
            LOGGER.info("You are trying to get a pricing value but pricing status is still PENDING")
            return None
        return price_value

    @property
    def price(self):
        return self._get_price_values(self._price)

    @property
    def base_fee(self):
        return self._get_price_values(self._base_fee)

    def set_price(self, price=None, base_fee=None):
        """
        Sets price and updates price status
        """
        self._price = None
        self._base_fee = None
        self.price_status = OrderItem.PricingStatus.PENDING

        # prices are 0 when user or invoice_contact is subscribed to the product
        if self.order.order_type.name == 'Utilisateur permanent':
            if self.product.free_when_subscribed:
                if self.order.client.identity.subscribed or (
                        self.order.invoice_contact is not None and self.order.invoice_contact.subscribed):
                    self._price = Money(0, 'CHF')
                    self._base_fee = Money(0, 'CHF')
                    self.price_status = OrderItem.PricingStatus.CALCULATED
                    return
            # if user adds other products than the ones he's subscribed, quote needs to be done
            self.price_status = OrderItem.PricingStatus.PENDING
            return

        # prices are 0 when order is for public authorities or academic purposes
        if self.order.order_type.name in ( 'Communal', 'Cantonal', 'Fédéral', 'Académique'):
            self._price = Money(0, 'CHF')
            self._base_fee = Money(0, 'CHF')
            self.price_status = OrderItem.PricingStatus.CALCULATED
            return

        if self.product.pricing.pricing_type != Pricing.PricingType.MANUAL:
            if self.product.pricing.pricing_type == Pricing.PricingType.FROM_CHILDREN_OF_GROUP:
                self._price = Money(0, 'CHF')
                self._base_fee = Money(0, 'CHF')
                for product in self.product.products.all():
                    if product.geom.intersects(self.order.geom):
                        price, base_fee = product.pricing.get_price(self.order.geom)
                        if price:
                            self._price += price
                        if base_fee:
                            self._base_fee = base_fee if base_fee > self._base_fee else self._base_fee
            else:
                self._price, self._base_fee = self.product.pricing.get_price(self.order.geom)
            if self._price is not None:
                self.price_status = OrderItem.PricingStatus.CALCULATED
                return
        else:
            if price is not None:
                self._price = price
                self._base_fee = base_fee
                self.price_status = OrderItem.PricingStatus.CALCULATED
                return
        self.price_status = OrderItem.PricingStatus.PENDING
        return

    def ask_validation(self):
        """
        Sends email to the first metadata contact that is validator to ask for validation.
        If validator cannot be found, an email to one of the metadata contact is sent.
        """
        self.token = secrets.token_urlsafe(32)
        self.status = OrderItem.OrderItemStatus.VALIDATION_PENDING
        validator = MetadataContact.objects.filter(metadata=self.product.metadata).order_by('-is_validator').first()
        send_geoshop_email(
            _('Geoshop - Validation requested'),
            recipient=validator.contact_person,
            template_name='email_validation_needed',
            template_data={
                'front_url': '{}://{}{}'.format(
                    settings.FRONT_PROTOCOL,
                    settings.FRONT_URL,
                    settings.FRONT_HREF
                    ),
                'what': 'orderitem',
                'token': self.token,
            }
        )

    def ask_price(self):
        send_geoshop_email(
            _('Geoshop - Quote requested'),
            template_name='email_admin',
            template_data={
                'messages': [_('A new quote has been requested:')],
                'details': {
                    _('order'): self.order.id,
                    _('product'): self.product.label,
                    _('link'): reverse("admin:api_order_change", args=[self.order.id])
                }
            }
        )


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
    field_type = models.CharField(
        _('field_type'), max_length=10, choices=ProductFieldType.choices, blank=True)
    field_length = models.SmallIntegerField(_('field_length'), )
    product = models.ForeignKey(Product, verbose_name=_('product'), on_delete=models.CASCADE)

    class Meta:
        db_table = 'product_field'
        verbose_name = _('product_field')


class ProductFormat(models.Model):
    product = models.ForeignKey(
        Product, models.CASCADE, verbose_name=_('product'), related_name='product_formats')
    data_format = models.ForeignKey(DataFormat, models.CASCADE, verbose_name=_('data_format'))
    # extraction manuelle ou automatique
    is_manual = models.BooleanField(_('is_manual'), default=False)

    class Meta:
        db_table = 'product_format'
        unique_together = (('product', 'data_format'),)
        verbose_name = _('product_format')


class UserChange(AbstractIdentity):
    """
    Stores temporary data in order to proceed user profile change requests.
    """
    client = models.ForeignKey(UserModel, models.CASCADE, verbose_name=_('client'))
    ide_id = models.CharField(_('ide_number'), max_length=15, null=True, blank=True, validators=[
        RegexValidator(
            regex=r'^CHE-([0-9]{3}\.){2}[0-9]{3}$',
            message=_('IDE number is not valid'),
        ),
    ])

    class Meta:
        db_table = 'user_change'
        verbose_name = _('user_change')
