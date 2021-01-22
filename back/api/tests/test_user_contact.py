from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

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
