import os
from django.urls import reverse
from django.core import management
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.gis.geos import Polygon
from rest_framework import status
from rest_framework.test import APITestCase
from api.models import OrderType, DataFormat, Pricing, Product, OrderItem, Order

UserModel = get_user_model()


class ProductGroupTests(APITestCase):
    """
    Test Products and groups of products
    """

    def setUp(self):
        management.call_command('fixturize')
        self.user_private = UserModel.objects.create_user(
            username="private_user_order",
            password="testPa$$word",
        )
        self.user_private.identity.email = 'user@sitn.com'
        self.user_private.identity.save()
        order_type_private = OrderType.objects.create(
            name="Privé",
        )
        self.user_extract = UserModel.objects.get(username='sitn_extract')
        self.user_extern_extract = UserModel.objects.create_user(
            username="extern_extract",
            password="testPa$$word"
        )
        self.user_extern_extract.groups.add(Group.objects.get(name='extract'))
        self.user_extern_extract.save()
        self.pricing_free = Pricing.objects.create(
            name="Gratuit",
            pricing_type="FREE"
        )
        self.group = Product.objects.create(
            label="Réseau d'eau",
            pricing=self.pricing_free,
            provider=self.user_extract,
            status=Product.ProductStatus.PUBLISHED
        )
        self.products = Product.objects.bulk_create([
            Product(
                label="Réseau d'eau de la commune d'Ankh",
                group=self.group,
                pricing=self.pricing_free,
                provider=self.user_extract,
                geom=Polygon((
                    (2537498, 1210000),
                    (2533183, 1180000),
                    (2520000, 1180000),
                    (2520000, 1210000),
                    (2537498, 1210000)
                )),
                status=Product.ProductStatus.PUBLISHED_ONLY_IN_GROUP
            ),
            Product(
                label="Réseau d'eau de la commune de Morpork",
                group=self.group,
                pricing=self.pricing_free,
                provider=self.user_extern_extract,
                geom=Polygon((
                    (2533183, 1180000),
                    (2537498, 1210000),
                    (2550000, 1210000),
                    (2550000, 1180000),
                    (2533183, 1180000)
                )),
                status=Product.ProductStatus.PUBLISHED_ONLY_IN_GROUP
            ),
            Product(
                label="Réseau d'eau du Klatch",
                group=self.group,
                pricing=self.pricing_free,
                provider=self.user_extern_extract,
                geom=Polygon.from_bbox((2564000, 1212000, 2570000, 1207000)),
                status=Product.ProductStatus.PUBLISHED_ONLY_IN_GROUP
            )
        ])
        self.order = Order.objects.create(
            title='Test 1734',
            description='Test 1734',
            order_type=order_type_private,
            client=self.user_private,
            geom=Polygon.from_bbox((2528577, 1193422, 2542482, 1199018)),
            date_ordered=timezone.now()
        )
        OrderItem.objects.create(
            order=self.order,
            price_status=OrderItem.PricingStatus.CALCULATED,
            product=self.group,
            data_format=DataFormat.objects.create(name="ZIP"),
        )

        url = reverse('token_obtain_pair')
        resp = self.client.post(
            url, {'username': 'sitn_extract', 'password': os.environ['EXTRACT_USER_PASSWORD']}, format='json')
        self.token = resp.data['access']
        resp = self.client.post(url, {'username':'private_user_order', 'password':'testPa$$word'}, format='json')
        self.client_token = resp.data['access']


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
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.client_token)
        url = reverse('order-confirm', kwargs={'pk':self.order.id})
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED, response.content)

        # First Extract user
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token)
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
