import os
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from api.models import Identity, OrderType, Product, Format


class AuthViewsTests(APITestCase):
    """
    Test authentication
    """

    def setUp(self):
        self.username = 'testuser'
        self.password = 'testPa$$word'
        self.email = os.environ.get('EMAIL_TEST_TO', 'test@example.com')

    def test_registration(self):
        """
        Tests registration
        """
        data = {
            'username': self.username,
            'password1': self.password,
            'password2': self.password,
            'email': self.email
        }
        url = reverse('auth_register')
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        user = Identity.objects.get(username=self.username)
        self.assertEqual(user.email, self.email, 'User is registered and has an email')

    def test_current_user(self):
        """
        Test current user view
        """
        data = {
            'username': self.username,
            'password': self.password
        }

        # URL using path name
        url = reverse('token_obtain_pair')

        user = Identity.objects.create_user(username=self.username, email='test@example.com', password=self.password)
        self.assertEqual(user.is_active, 1, 'Active User')

        # First post to get token
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        token = response.data['access']

        # Next post/get's will require the token to connect
        self.client.credentials(HTTP_AUTHORIZATION='Bearer {0}'.format(token))
        response = self.client.get(reverse('auth_current_user'), data={'format': 'json'})
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.data['username'], self.username, 'Gets his username')


class PricingTests(APITestCase):
    """
    Test Pricings
    """
    pass


class ItentityViewsTests(APITestCase):
    """
    Test Identities
    """

    def setUp(self):
        self.userPublic = Identity.objects.create_user(
            username="public_user",
            password="testPa$$word",
            is_public=True
        )
        self.userPrivate = Identity.objects.create_user(
            username="private_user",
            password="testPa$$word",
        )

    def test_view_public(self):
        """
        Tests that only public identities are visible
        """
        url = reverse('identity-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.data['count'], 1, 'Only one public identity is visible')

    def test_view_private(self):
        self.client.login(username='private_user', password='testPa$$word')
        url = reverse('identity-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.data['count'], 2, 'The two identities are visible')


class OrderTests(APITestCase):
    """
    Test Orders
    """

    def setUp(self):
        self.userPrivate = Identity.objects.create_user(
            username="private_user_order",
            password="testPa$$word",
        )
        self.orderTypePrivate = OrderType.objects.create(
            name="Privé",
        )
        self.format = Format.objects.create(
            name="Geobat NE complet (DXF)",
        )
        self.product = Product.objects.create(
            label="MO - Cadastre complet (Format A4-A3-A2-A1-A0)",
        )
        url = reverse('token_obtain_pair')
        resp = self.client.post(url, {'username':'private_user_order', 'password':'testPa$$word'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue('access' in resp.data)
        self.token = resp.data['access']


    def test_post_order(self):
        """
        Tests POST of an order
        """
        data = {
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
        url = reverse('order-list')
        response = self.client.post(url, data, format='json')
        # Forbidden if not logged in
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, response.content)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token)
        response = self.client.post(url, data, format='json')
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
                "product": "MO - Cadastre complet (Format A4-A3-A2-A1-A0)",
                "format": "Geobat NE complet (DXF)"}]
        }

        url = reverse('order-detail', kwargs={'pk':order_id})
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.data['items'][0]['product'], data['items'][0]['product'], 'Check product')
