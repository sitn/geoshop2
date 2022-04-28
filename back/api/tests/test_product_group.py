from django.urls import reverse
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.gis.geos import Polygon, MultiPolygon
from rest_framework import status
from rest_framework.test import APITestCase
from api.models import DataFormat, Product, ProductFormat, OrderItem
from api.tests.factories import BaseObjectsFactory, ExtractFactory


UserModel = get_user_model()


class ProductGroupTests(APITestCase):
    """
    Test Products and groups of products
    """

    def setUp(self):
        self.config = BaseObjectsFactory(self.client)
        self.extract_config = ExtractFactory(self.client)

        user_extern_extract = UserModel.objects.create_user(
            username="extern_extract",
            password="testPa$$word"
        )
        user_extern_extract.groups.add(Group.objects.get(name='extract'))
        user_extern_extract.save()

        self.group = Product.objects.create(
            label="Cadastre souterrain",
            pricing=self.config.pricings['free'],
            provider=self.extract_config.user,
            metadata=self.config.public_metadata,
            status=Product.ProductStatus.PUBLISHED
        )

        self.child_group = Product.objects.create(
            label="Réseau d'eau",
            group=self.group,
            pricing=self.config.pricings['free'],
            provider=self.extract_config.user,
            metadata=self.config.public_metadata,
            status=Product.ProductStatus.PUBLISHED
        )
        self.formats = DataFormat.objects.bulk_create([
            DataFormat(name="DXF"),
            DataFormat(name="DWG"),
        ])
        self.products = Product.objects.bulk_create([
            Product(
                label="Réseau d'eau de la commune d'Ankh",
                group=self.child_group,
                pricing=self.config.pricings['free'],
                provider=self.extract_config.user,
                metadata=self.config.public_metadata,
                geom=MultiPolygon(Polygon((
                    (2537498, 1210000),
                    (2533183, 1180000),
                    (2520000, 1180000),
                    (2520000, 1210000),
                    (2537498, 1210000)
                ))),
                status=Product.ProductStatus.PUBLISHED
            ),
            Product(
                label="Réseau d'eau de la commune de Morpork",
                group=self.child_group,
                pricing=self.config.pricings['free'],
                provider=user_extern_extract,
                metadata=self.config.public_metadata,
                geom=MultiPolygon(Polygon((
                    (2533183, 1180000),
                    (2537498, 1210000),
                    (2550000, 1210000),
                    (2550000, 1180000),
                    (2533183, 1180000)
                ))),
                status=Product.ProductStatus.PUBLISHED_ONLY_IN_GROUP
            ),
            Product(
                label="Réseau d'eau du Klatch",
                group=self.child_group,
                pricing=self.config.pricings['free'],
                provider=user_extern_extract,
                metadata=self.config.public_metadata,
                geom=MultiPolygon(Polygon.from_bbox((2564000, 1212000, 2570000, 1207000))),
                status=Product.ProductStatus.PUBLISHED_ONLY_IN_GROUP
            )
        ])
        ProductFormat.objects.bulk_create([
            ProductFormat(product=self.products[0], data_format=self.config.formats['dxf']),
            ProductFormat(product=self.products[1], data_format=self.config.formats['dwg']),
            ProductFormat(product=self.products[2], data_format=self.config.formats['dxf']),
        ])

        OrderItem.objects.create(
            order=self.config.order,
            price_status=OrderItem.PricingStatus.CALCULATED,
            product=self.group,
            data_format=DataFormat.objects.create(name="ZIP"),
        )

    def test_products_are_visible(self):
        url = reverse('product-list')
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(len(response.data), 4, 'Check that all products are visible')

    def test_groups_are_expanded_when_confirmed(self):
        """
        Client confirms an order with a `group` product.
        Each product in the group that intersects order geometry will be ready for extract.
        """
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.config.client_token)
        url = reverse('order-confirm', kwargs={'pk':self.config.order.id})
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED, response.content)

        # First Extract user
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.extract_config.token)
        url = reverse('extract_order')
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(len(response.data), 1, 'Response should have only one item')

        # Second Extract user
        url = reverse('token_obtain_pair')
        resp = self.client.post(
            url, {'username': 'extern_extract', 'password': 'testPa$$word'}, format='json')
        extern_token = resp.data['access']
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + extern_token)
        url = reverse('extract_order')
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(len(response.data), 1, 'Response should have only one item')
