import os
from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Polygon
from django.core import management
from djmoney.money import Money
from django.utils import timezone
from django.urls import reverse

from api.models import Contact, DataFormat, Metadata, Order, OrderType, Pricing, Product, ProductFormat

UserModel = get_user_model()
TOKEN_URL = reverse('token_obtain_pair')

class BaseObjectsFactory:
    # constants
    password = 'testPa$$word'
    private_username = 'private_user'
    base_fee = Money(50, 'CHF')
    unit_price = Money(150, 'CHF')
    min_price = Money(150, 'CHF')
    max_price = Money(150, 'CHF')

    def __init__(self, webclient=None):
        # Creates admin account and Extract group with permissions
        management.call_command('fixturize')
        self.user_private = UserModel.objects.create_user(
            username=self.private_username,
            password=self.password
        )
        self.user_private.identity.email = 'user@sitn.com'
        self.user_private.identity.save()

        if webclient:
            resp = webclient.post(
                TOKEN_URL, {
                    'username': self.private_username,
                    'password': self.password
                },
                format='json'
            )
            self.client_token = resp.data['access']

        self.public_metadata = Metadata.objects.create(
            id_name='00_generic',
            modified_user=self.user_private,
            accessibility=Metadata.MetadataAccessibility.PUBLIC
        )

        self.private_metadata = Metadata.objects.create(
            id_name='01_private',
            modified_user=self.user_private,
            accessibility=Metadata.MetadataAccessibility.INTERNAL
        )

        self.pricings = {
            'free': Pricing.objects.create(
                name="Gratuit",
                pricing_type="FREE"
            ),
            'single': Pricing.objects.create(
                name="Forfait",
                pricing_type="SINGLE",
                unit_price=self.unit_price,
                base_fee=Money(20, 'CHF')
            ),
            'by_number_objects': Pricing.objects.create(
                name="Par nombre d'objets",
                pricing_type="BY_NUMBER_OBJECTS",
                unit_price=Money(1, 'CHF'),
                max_price=Money(250, 'CHF')
            ),
            'by_area': Pricing.objects.create(
                name="Par surface",
                pricing_type="BY_AREA",
                unit_price=self.unit_price,
                base_fee=Money(50, 'CHF')
            ),
            'from_pricing_layer': Pricing.objects.create(
                name="Par couche géométrique",
                pricing_type="FROM_PRICING_LAYER"
            ),
            'manual': Pricing.objects.create(
                name="Devis manuel",
                pricing_type="MANUAL"
            ),
            'yet_unknown_pricing': Pricing.objects.create(
                name="Style de prix non connu de l'application",
                pricing_type="YET_UNKNOWN_PRICING"
            ),
            'from_children_of_group': Pricing.objects.create(
                name="Prix selon ce qu'il y a dans le groupe",
                pricing_type="FROM_CHILDREN_OF_GROUP"
            )
        }

        self.provider = UserModel.objects.get(username='sitn_extract')

        self.products = {
            'free': Product.objects.create(
                label="Produit gratuit",
                pricing=self.pricings['free'],
                metadata=self.public_metadata,
                status=Product.ProductStatus.PUBLISHED,
                provider=self.provider
            ),
            'single': Product.objects.create(
                label="Produit forfaitaire",
                pricing=self.pricings['single'],
                metadata=self.public_metadata,
                status=Product.ProductStatus.PUBLISHED,
                provider=self.provider
            ),
            'by_number_objects': Product.objects.create(
                label="Bâtiments 3D",
                pricing=self.pricings['by_number_objects'],
                metadata=self.public_metadata,
                status=Product.ProductStatus.PUBLISHED,
                provider=self.provider
            ),
            'by_area': Product.objects.create(
                label="Produit vendu au m²",
                pricing=self.pricings['by_area'],
                metadata=self.public_metadata,
                status=Product.ProductStatus.PUBLISHED,
                provider=self.provider
            ),
            'from_pricing_layer': Product.objects.create(
                label="MO",
                pricing=self.pricings['from_pricing_layer'],
                metadata=self.public_metadata,
                status=Product.ProductStatus.PUBLISHED,
                free_when_subscribed=True,
                provider=self.provider
            ),
            'manual': Product.objects.create(
                label="Maquette 3D",
                pricing=self.pricings['manual'],
                metadata=self.public_metadata,
                status=Product.ProductStatus.PUBLISHED,
                provider=self.provider
            ),
            'yet_unknown_pricing': Product.objects.create(
                label="Produit facturé au Mb (non implémenté)",
                pricing=self.pricings['yet_unknown_pricing'],
                metadata=self.public_metadata,
                status=Product.ProductStatus.PUBLISHED,
                provider=self.provider
            )
        }

        self.formats = {
            'dxf': DataFormat.objects.create(name="DXF"),
            'dwg': DataFormat.objects.create(name="DWG"),
            'geobat': DataFormat.objects.create(name="Geobat NE complet (DXF)"),
            'rhino': DataFormat.objects.create(name="Rhino 3DM"),
        }

        for product in self.products.values():
            ProductFormat.objects.bulk_create([
                ProductFormat(product=product, data_format=self.formats['dxf']),
                ProductFormat(product=product, data_format=self.formats['dwg']),
            ])

        self.order_types = {
            'private': OrderType.objects.create(
                name="Privé",
            ),
            'public': OrderType.objects.create(
                name="Communal",
            ),
            'subscribed': OrderType.objects.create(
                name="Utilisateur permanent",
            )
        }

        self.contact = Contact.objects.create(
            first_name='Jean',
            last_name='Doe',
            email='test3@admin.com',
            postcode=2000,
            city='Lausanne',
            country='Suisse',
            company_name='Marine de Colombier',
            phone='+41 00 787 29 16',
            belongs_to=self.user_private
        )

        self.order = Order.objects.create(
            client=self.user_private,
            order_type=self.order_types['private'],
            title="Basic test order",
            description="This order was created during testing",
            geom=Polygon.from_bbox((2528577, 1193422, 2542482, 1199018)),
            date_ordered=timezone.now()
        )


class ExtractFactory:
    password = os.environ['EXTRACT_USER_PASSWORD']
    username = 'sitn_extract'

    def __init__(self, webclient):
        self.user = UserModel.objects.get(username=self.username)

        resp = webclient.post(
            TOKEN_URL, {
                'username': self.username,
                'password': self.password
            },
            format='json'
        )
        self.token = resp.data['access']
