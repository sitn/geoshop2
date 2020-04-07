from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from api.models import Identity


class AuthViewsTests(APITestCase):
    """
    Test authentication
    """

    def setUp(self):
        self.username = 'testuser'
        self.password1 = 'testPa$$word'
        self.data = {
            'username': self.username,
            'password': self.password
        }

    def test_registration(self):
        url = reverse('auth_register')

    def test_current_user(self):
        # URL using path name
        url = reverse('token_obtain_pair')

        user = Identity.objects.create_user(username=self.username, email='test@example.com', password=self.password)
        self.assertEqual(user.is_active, 1, 'Active User')

        # First post to get token
        response = self.client.post(url, self.data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        token = response.data['access']

        # Next post/get's will require the token to connect
        self.client.credentials(HTTP_AUTHORIZATION='Bearer {0}'.format(token))
        response = self.client.get(reverse('auth_current_user'), data={'format': 'json'})
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(response.data['username'], self.username, 'Gets his username')
