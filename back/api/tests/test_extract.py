

import os
from django.urls import reverse
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework import status
from rest_framework.test import APITestCase
from api.models import DataFormat, OrderItem, Order
from api.tests.factories import BaseObjectsFactory, ExtractFactory

UserModel = get_user_model()


class OrderTests(APITestCase):
    """
    Test Extract
    """

    def setUp(self):
        self.config = BaseObjectsFactory(self.client)
        self.extract_config = ExtractFactory(self.client)

        self.products = [
            self.config.products['free'],
            self.config.products['single']
        ]

        for product in self.products:
            OrderItem.objects.create(
                order=self.config.order,
                price_status=OrderItem.PricingStatus.CALCULATED,
                product=product,
                data_format=DataFormat.objects.create(name="ZIP"),
            )
        self.config.order.confirm()
        self.config.order.save()

        self.empty_zip_data = b'PK\x05\x06\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'

        url = reverse('token_obtain_pair')
        resp = self.client.post(
            url, {'username': 'sitn_extract', 'password': os.environ['EXTRACT_USER_PASSWORD']}, format='json')
        self.extract_token = resp.data['access']


    def test_put_files(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.extract_token)
        url = reverse('extract_order')
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertGreater(len(response.data), 0, 'Check there is an order')
        order_id = response.data[0]['id']
        order_item_id1 = response.data[0]['items'][0]['id']
        order_item_id2 = response.data[0]['items'][1]['id']

        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT, response.content)

        url = reverse('extract_orderitem', kwargs={'pk': order_item_id1})
        extract_file = SimpleUploadedFile("result.zip", self.empty_zip_data, content_type="multipart/form-data")
        response = self.client.put(url, {'extract_result': extract_file, 'comment': 'ok'})
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED, response.content)
        self.assertEqual(
            Order.objects.get(pk=order_id).status,
            Order.OrderStatus.PARTIALLY_DELIVERED,
            "Check order status is partially delivered"
        )

        url = reverse('extract_orderitem', kwargs={'pk': order_item_id2})
        extract_file = SimpleUploadedFile("result2.zip", self.empty_zip_data, content_type="multipart/form-data")
        response = self.client.put(url, {'extract_result': extract_file})
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED, response.content)
        self.assertEqual(
            Order.objects.get(pk=order_id).status,
            Order.OrderStatus.PROCESSED,
            "Check order status is processed"
        )
        self.assertEqual(len(mail.outbox), 1, 'An email has been sent to client')

        # Download file by user
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.config.client_token)
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
        self.assertIsNotNone(response.data['download_link'], 'Check file is visible for user')

        # check if second file has been downloaded
        order = Order.objects.get(pk=order_id)
        self.assertIsNotNone(order.date_downloaded, 'Check if there\'s a last_download date')


    def test_cancel_order_item(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.extract_token)
        url = reverse('extract_order')
        response = self.client.get(url, format='json')
        order_item_id1 = response.data[0]['items'][0]['id']
        order_item_id2 = response.data[0]['items'][1]['id']
        url = reverse('extract_orderitem', kwargs={'pk': order_item_id1})

        response = self.client.put(url, {'is_rejected': True, 'comment': 'Interdit de commander ces données'})
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED, response.content)
        self.assertEqual(
            Order.objects.get(pk=self.config.order.id).status,
            Order.OrderStatus.READY,
            "Check order status is still ready"
        )

        url = reverse('extract_orderitem', kwargs={'pk': order_item_id2})
        extract_file = SimpleUploadedFile("result3.zip", self.empty_zip_data, content_type="multipart/form-data")
        response = self.client.put(url, {'extract_result': extract_file})
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED, response.content)
        self.assertEqual(
            Order.objects.get(pk=self.config.order.id).status,
            Order.OrderStatus.PROCESSED,
            "Check order status is processed"
        )


    def test_reject_order(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.extract_token)
        url = reverse('extract_order')
        response = self.client.get(url, format='json')
        order_item_id1 = response.data[0]['items'][0]['id']
        order_item_id2 = response.data[0]['items'][1]['id']
        url = reverse('extract_orderitem', kwargs={'pk': order_item_id1})

        response = self.client.put(url, {'is_rejected': True, 'comment': 'Interdit de commander ces données'})
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED, response.content)
        self.assertEqual(
            Order.objects.get(pk=self.config.order.id).status,
            Order.OrderStatus.READY,
            "Check order status is still ready for extract"
        )

        url = reverse('extract_orderitem', kwargs={'pk': order_item_id2})
        response = self.client.put(url, {'is_rejected': True, 'comment': 'Interdit de commander ces données'})
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED, response.content)
        self.assertEqual(
            Order.objects.get(pk=self.config.order.id).status,
            Order.OrderStatus.REJECTED,
            "Check order status is rejected"
        )


    def multi_extract_user_order(self):
        """
        Two different extract users proceeds an order with products from mixed providers
        """
        extract_group = Group.objects.get(name='extract')
        user_extern_extract = UserModel.objects.create_user(
            username="extern_extract",
            password="testPa$$word",
            group=extract_group
        )
        self.products[0].provider = user_extern_extract
        self.products[0].save()

        # First Extract user
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.extract_token)
        url = reverse('extract_order')
        response = self.client.get(url, format='json')
        order_item_id1 = response.data[0]['items'][0]['id']
        self.assertEqual(len(response.data), 1, 'Response should have only one item')
        url = reverse('extract_orderitem', kwargs={'pk': order_item_id1})
        response = self.client.put(url, {'is_rejected': True, 'comment': 'Interdit de commander ces données'})
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED, response.content)
        self.assertEqual(
            Order.objects.get(pk=self.config.order.id).status,
            Order.OrderStatus.READY,
            "Check order status is still ready for extract"
        )
        url = reverse('extract_order')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT, response.content)

        # Second Extract user
        url = reverse('token_obtain_pair')
        resp = self.client.post(
            url, {'username': 'extern_extract', 'password': 'testPa$$word'}, format='json')
        extern_token = resp.data['access']
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + extern_token)
        url = reverse('extract_order')
        response = self.client.get(url, format='json')
        order_item_id2 = response.data[0]['items'][0]['id']
        self.assertEqual(len(response.data), 1, 'Response should have only one item')
        self.assertNotEqual(order_item_id1, order_item_id2, 'Order item ids are different')
        url = reverse('extract_orderitem', kwargs={'pk': order_item_id2})
        extract_file = SimpleUploadedFile("result3.zip", self.empty_zip_data, content_type="multipart/form-data")
        response = self.client.put(url, {'extract_result': extract_file})
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED, response.content)
        self.assertEqual(
            Order.objects.get(pk=self.config.order.id).status,
            Order.OrderStatus.PROCESSED,
            "Check order status is processed"
        )
        url = reverse('extract_order')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT, response.content)
        self.assertEqual(len(mail.outbox), 1, 'An email has been sent to client')
