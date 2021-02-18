import os
from django.urls import reverse
from django.core import mail
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from api.models import UserChange

UserModel = get_user_model()

class UserChangeTests(APITestCase):
    """
    Test user changes
    """
    def setUp(self):
        self.user = UserModel.objects.create_user(
            username="common_user",
            password="testPa$$word",
        )
        self.user.identity.is_public = True
        self.user.identity.save()

        self.admin = UserModel.objects.create_user(
            username="admin_user",
            password="testPa$$wordAdmin",
            is_staff=True,
            email=os.environ.get('EMAIL_TEST_TO', 'test@example.com')
        )

        url = reverse('token_obtain_pair')
        resp = self.client.post(url, {'username':'common_user', 'password':'testPa$$word'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue('access' in resp.data)
        self.token = resp.data['access']

    def test_user_create_private(self):
        url = reverse('auth_register')
        data = {
            'username': 'jdupond',
            'first_name': 'Jean',
            'last_name': 'Dupond',
            'street': 'Tivoli 22',
            'city': 'Neuchâtel-les-Bains',
            'email': 'admin@gmail.com',
            'password1': 'testPa$$word',
            'password2': 'testPa$$word'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(len(mail.outbox), 2, 'An email has been sent to admins and to the new user')

    def test_user_create_with_company(self):
        url = reverse('auth_register')
        data = {
            'username': 'jdupond',
            'first_name': 'Jean',
            'last_name': 'Dupond',
            'street': 'Tivoli 22',
            'city': 'Neuchâtel-les-Bains',
            'email': 'admin@gmail.com',
            'company_name': 'SITN',
            'ide_id': 'CHE-25',
            'password1': 'testPa$$word',
            'password2': 'testPa$$word'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, 'IDE number is not valid')
        data['ide_id'] = 'CHE-999.999.999'
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(len(mail.outbox), 2, 'An email has been sent to admins and to the new user')

    def test_user_change(self):
        """
        Tests POST of an user change request
        """
        url = reverse('auth_change_user')
        data = {
            'last_name': 'i_got_married',
            'street': 'honeymoon',
            'city': 'Las Vegas',
            'this_is_fake': ')DELETE * FROM public;('
        }
        response = self.client.post(url, data, format='json')
        # Forbidden if not logged in
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED, response.content)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token)
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        change_user = UserChange.objects.filter(last_name='i_got_married').first()
        self.assertEqual(change_user.city, data['city'], 'Check if the city in the DB is the same')
