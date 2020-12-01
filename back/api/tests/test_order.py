import os
from django.urls import reverse
from django.conf import settings
from django.core import management
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from api.models import OrderType, DataFormat, Pricing, Product, OrderItem, Order


UserModel = get_user_model()

class OrderTests(APITestCase):
    """
    Test Orders
    """

    def setUp(self):
        self.order_data = {
            'order_type': 'Privé',
            'items': [],
            'title': 'Test 1734',
            'description': 'Nice order',
            'geom': {
                'type': 'Polygon',
                'coordinates': [
                    [
                        [
                            2528577.8382161376,
                            1193422.4003930448
                        ],
                        [
                            2542482.6542869355,
                            1193422.4329014618
                        ],
                        [
                            2542482.568523701,
                            1199018.36469272
                        ],
                        [
                            2528577.807487005,
                            1199018.324372703
                        ],
                        [
                            2528577.8382161376,
                            1193422.4003930448
                        ]
                    ]
                ]
            },
        }
        management.call_command('fixturize')
        self.userPrivate = UserModel.objects.create_user(
            username="private_user_order",
            password="testPa$$word",
        )
        self.orderTypePrivate = OrderType.objects.create(
            name="Privé",
        )
        self.formats = DataFormat.objects.bulk_create([
            DataFormat(name="Geobat NE complet (DXF)"),
            DataFormat(name="Rhino 3DM"),
        ])
        self.pricing_free = Pricing.objects.create(
            name="Gratuit",
            pricing_type="FREE"
        )
        self.pricing_manual = Pricing.objects.create(
            name="Manuel",
            pricing_type="MANUAL"
        )
        self.products = Product.objects.bulk_create([
            Product(
                label="MO - Cadastre complet (Format A4-A3-A2-A1-A0)",
                pricing=self.pricing_free),
            Product(
                label="Maquette 3D",
                pricing=self.pricing_manual),
        ])
        url = reverse('token_obtain_pair')
        resp = self.client.post(url, {'username':'private_user_order', 'password':'testPa$$word'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue('access' in resp.data)
        self.token = resp.data['access']

    def get_order_item(self):
        url = reverse('orderitem-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_post_order_auto_price(self):
        """
        Tests POST of an order
        """
        url = reverse('order-list')
        response = self.client.post(url, self.order_data, format='json')
        # Forbidden if not logged in
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, response.content)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token)
        response = self.client.post(url, self.order_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        # Last draft view
        url = reverse('order-last-draft')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertTrue('id' in response.data)
        order_id = response.data['id']

        # Update
        data = {
            "items": [{
                "product": "MO - Cadastre complet (Format A4-A3-A2-A1-A0)"}]
        }

        url = reverse('order-detail', kwargs={'pk':order_id})
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.data['items'][0]['product'], data['items'][0]['product'], 'Check product')
        self.assertEqual(
            response.data['items'][0]['price_status'], OrderItem.PricingStatus.CALCULATED, 'Check price is calculated')
        self.assertIsNotNone(response.data['items'][0]['available_formats'], 'Check available formats are present')

        order_item_id = response.data['items'][0]['id']
        # Confirm order without format should not work
        url = reverse('order-confirm', kwargs={'pk':order_item_id})
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.content)

        # Choose format
        data = {
            "data_format": "Geobat NE complet (DXF)"
        }
        url = reverse('orderitem-detail', kwargs={'pk':order_item_id})
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)

        # Confirm order with format should work
        url = reverse('order-confirm', kwargs={'pk':order_item_id})
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED, response.content)
        # Confirm order that's already confirmed, should not work
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, response.content)
        # Edit order that's already confimed, should not work
        data = {
            "items": [{
                "product": "Maquette 3D"}]
        }
        url = reverse('order-detail', kwargs={'pk':order_id})
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, response.content)

        # Extract
        url = reverse('token_obtain_pair')
        response = self.client.post(url, {'username':'extract', 'password':os.environ['EXTRACT_USER_PASSWORD']}, format='json')
        extract_token = response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + extract_token)
        url = reverse('extract_order')
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.data[0]['title'], 'Test 1734', 'Check that previous confirmed order is available')
        order_item_id = response.data[0]['items'][0]['id']
        url = reverse('extract_orderitem', kwargs={'pk':order_item_id})
        extract_file = SimpleUploadedFile("result.zip", b"file_content", content_type="multipart/form-data")
        response = self.client.put(url, {'extract_result': extract_file})
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED, response.content)

        # Download file by user
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token)
        url = reverse('order-detail', kwargs={'pk':order_item_id})
        response = self.client.get(url)
        self.assertEqual(response.data['status'], Order.OrderStatus.PROCESSED, 'Check order status is processed')
        url = reverse('orderitem-download-link', kwargs={'pk':order_item_id})
        response = self.client.get(url)
        self.assertIsNotNone(response.data['download_link'], 'Check file is visible for user')

        # check if file has been downloaded
        order_item = OrderItem.objects.get(pk=order_item_id)
        self.assertIsNotNone(order_item.last_download, 'Check if theres a last_download date')

    def test_post_order_quote(self):
        url = reverse('order-list')
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token)
        response = self.client.post(url, self.order_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        order_id = response.data['id']
        # Update
        data = {
            "items": [
                {
                    "product": "Maquette 3D",
                    "data_format": "Rhino 3DM"
                }
            ]
        }
        url = reverse('order-detail', kwargs={'pk':order_id})
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.data['items'][0]['product'], data['items'][0]['product'], 'Check product')
        self.assertEqual(
            response.data['items'][0]['price_status'], OrderItem.PricingStatus.PENDING, 'Check quote is needed')
