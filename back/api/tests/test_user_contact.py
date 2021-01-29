from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from api.models import Contact

UserModel = get_user_model()

class UserContacts(APITestCase):
    """
    Test user changes
    """

    def setUp(self):
        self.user = UserModel.objects.create_user(
            username="common_user",
            password="testPa$$word",
        )
        self.user.save()

        self.contact = {
            'first_name': "Jean",
            'last_name': "Doe",
        }

        self.contact2 = Contact.objects.create(
            first_name='Marcelle',
            last_name='Rieda',
            email='test2@admin.com',
            postcode=2000,
            city='Neuchâtel',
            country='Suisse',
            company_name='SITN',
            phone='+41 00 787 45 16',
            belongs_to=self.user
        )

        url = reverse('token_obtain_pair')
        resp = self.client.post(url, {'username':'common_user', 'password':'testPa$$word'}, format='json')
        self.token = resp.data['access']

    def test_post_contact(self):
        data = {
            'first_name': self.contact['first_name'],
            'last_name': self.contact['last_name']
        }
        url = reverse('contact-list')
        response = self.client.get(url, format='json')
        # Forbidden if not logged in
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED, response.content)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token)

        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        self.assertEqual(response.data['first_name'], self.contact['first_name'], 'Check contact first name')

        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(
            response.data['results'][0]['first_name'], self.contact['first_name'], 'Check contact first name')

    def test_delete_contact(self):
        url = reverse('contact-list')
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token)
        response = self.client.get(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        url = response.data['results'][0]['url']

        response = self.client.delete(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT, response.content)

        url = reverse('contact-list')
        response = self.client.get(url, format='json')
        self.assertListEqual(
            response.data['results'], [], 'There are no visible contacts')

    def test_update_contact(self):
        data = {
            'first_name': self.contact['first_name'],
            'last_name': self.contact['last_name']
        }
        url = reverse('contact-list')
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.token)
        response = self.client.get(url, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        url = response.data['results'][0]['url']

        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED, 'PATCH not allowed')
