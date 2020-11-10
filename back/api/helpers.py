import os
import uuid
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.deconstruct import deconstructible


@deconstructible
class RandomFileName(object):
    """
    When uploading files, creates directory structure based on current year and month
    Also creates unique filename base on uuid and not guessable
    """

    def __init__(self, path_suffix):
        self.path_suffix = path_suffix

    def __call__(self, _, filename):
        today = timezone.now()
        current_path = os.path.join(self.path_suffix, str(
            today.year), str(today.month), "{}{}")
        first_part = str(uuid.uuid4())[0:9]
        return current_path.format(first_part, filename)


def send_email_to_admin(subject, message):
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [settings.ADMIN_EMAIL_LIST],
        fail_silently=False,
    )


def send_email_to_identity(subject, message, identity):
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [identity.email],
        fail_silently=False,
    )
