

import os
import time
from django.urls import reverse
from django.core import management
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Polygon
from djmoney.money import Money
from rest_framework import status
from rest_framework.test import APITestCase
from api.models import OrderType, DataFormat, Pricing, Product, OrderItem, Order

UserModel = get_user_model()


class OrderTests(APITestCase):
    """
    Test Extract
    """

    def setUp(self):
        management.call_command('fixturize')
        self.user_private = UserModel.objects.create_user(
            username="private_user_order",
            password="testPa$$word",
        )
        order_type_private = OrderType.objects.create(
            name="Privé",
        )
        pricing_free = Pricing.objects.create(
            name="Gratuit",
            pricing_type="FREE"
        )
        self.products = Product.objects.bulk_create([
            Product(
                label="MO - Cadastre complet (Format A4-A3-A2-A1-A0)",
                pricing=pricing_free),
            Product(
                label="Maquette 3D",
                pricing=pricing_free),
        ])
        self.order = Order.objects.create(
            title='Test 1734',
            description='Test 1734',
            order_type=order_type_private,
            client=self.user_private,
            geom=Polygon((
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
            )),
            date_ordered=timezone.now()
        )
        for product in self.products:
            OrderItem.objects.create(
                order=self.order,
                price_status=OrderItem.PricingStatus.CALCULATED,
                product=product,
                data_format=DataFormat.objects.create(name="ZIP"),
            )
        self.order.confirm()
        self.order.save()

        url = reverse('token_obtain_pair')
        resp = self.client.post(
            url, {'username': 'extract', 'password': os.environ['EXTRACT_USER_PASSWORD']}, format='json')
        self.token = resp.data['access']
        resp = self.client.post(url, {'username':'private_user_order', 'password':'testPa$$word'}, format='json')
        self.client_token = resp.data['access']


    def test_put_files(self):
        empty_zip_data = b'PK\x05\x06\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token)
        url = reverse('extract_order')
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.data[0]['title'], 'Test 1734', 'Check that previous confirmed order is available')
        order_id = response.data[0]['id']
        order_item_id1 = response.data[0]['items'][0]['id']
        order_item_id2 = response.data[0]['items'][1]['id']

        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT, response.content)

        url = reverse('extract_orderitem', kwargs={'pk': order_item_id1})
        extract_file = SimpleUploadedFile("result.zip", empty_zip_data, content_type="multipart/form-data")
        response = self.client.put(url, {'extract_result': extract_file, 'comment': 'ok'})
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED, response.content)
        self.assertEqual(
            Order.objects.get(pk=order_id).status,
            Order.OrderStatus.PARTIALLY_DELIVERED,
            "Check order status is partially delivered"
        )

        url = reverse('extract_orderitem', kwargs={'pk': order_item_id2})
        extract_file = SimpleUploadedFile("result2.zip", empty_zip_data, content_type="multipart/form-data")
        response = self.client.put(url, {'extract_result': extract_file})
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED, response.content)

        # Download file by user
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.client_token)
        url = reverse('order-detail', kwargs={'pk': order_id})
        response = self.client.get(url)
        self.assertEqual(
            response.data['status'], Order.OrderStatus.PROCESSED, 'Check order status is processed')
        url = reverse('orderitem-download-link', kwargs={'pk': order_item_id1})
        response = self.client.get(url)
        self.assertIsNotNone(response.data['download_link'], 'Check file is visible for user')

        # check if file has been downloaded
        order_item1 = OrderItem.objects.get(pk=order_item_id1)
        self.assertIsNotNone(order_item1.last_download, 'Check if there\'s a last_download date')

        # check other file has not been downloaded
        order_item2 = OrderItem.objects.get(pk=order_item_id2)
        self.assertIsNone(order_item2.last_download, 'Check if there\'s not a last_download date')

        url = reverse('order-download-link', kwargs={'pk': order_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertIsNotNone(response.data['detail'], 'response has detail')
        time.sleep(0.5)
        response = self.client.get(url)
        self.assertIsNotNone(response.data['download_link'], 'Check file is visible for user')

        # check if second file has been downloaded
        order_item2 = OrderItem.objects.get(pk=order_item_id2)
        self.assertIsNotNone(order_item2.last_download, 'Check if there\'s a last_download date')


    def test_cancel_order_item(self):
        empty_zip_data = b'PK\x05\x06\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token)
        url = reverse('extract_order')
        response = self.client.get(url, format='json')
        order_item_id1 = response.data[0]['items'][0]['id']
        order_item_id2 = response.data[0]['items'][1]['id']
        url = reverse('extract_orderitem', kwargs={'pk': order_item_id1})

        response = self.client.put(url, {'is_rejected': True, 'comment': 'Interdit de commander ces données'})
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED, response.content)
        self.assertEqual(
            Order.objects.get(pk=self.order.id).status,
            Order.OrderStatus.IN_EXTRACT,
            "Check order status is pending"
        )

        url = reverse('extract_orderitem', kwargs={'pk': order_item_id2})
        extract_file = SimpleUploadedFile("result3.zip", empty_zip_data, content_type="multipart/form-data")
        response = self.client.put(url, {'extract_result': extract_file})
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED, response.content)
        self.assertEqual(
            Order.objects.get(pk=self.order.id).status,
            Order.OrderStatus.PROCESSED,
            "Check order status is processed"
        )


    def test_reject_order(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token)
        url = reverse('extract_order')
        response = self.client.get(url, format='json')
        order_item_id1 = response.data[0]['items'][0]['id']
        order_item_id2 = response.data[0]['items'][1]['id']
        url = reverse('extract_orderitem', kwargs={'pk': order_item_id1})

        response = self.client.put(url, {'is_rejected': True, 'comment': 'Interdit de commander ces données'})
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED, response.content)
        self.assertEqual(
            Order.objects.get(pk=self.order.id).status,
            Order.OrderStatus.IN_EXTRACT,
            "Check order status is pending"
        )

        url = reverse('extract_orderitem', kwargs={'pk': order_item_id2})
        response = self.client.put(url, {'is_rejected': True, 'comment': 'Interdit de commander ces données'})
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED, response.content)
        self.assertEqual(
            Order.objects.get(pk=self.order.id).status,
            Order.OrderStatus.REJECTED,
            "Check order status is rejected"
        )
