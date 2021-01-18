import uuid
import zipfile
from pathlib import Path
from multiprocessing import Process
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
        first_part = str(uuid.uuid4())[0:9]
        current_path = Path(self.path_suffix, str(
            today.year), str(today.month), "{}{}".format(first_part, filename))
        return current_path


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


def _zip_them_all(full_zip_path, zip_list_path):
    """
    Takes a list of zip paths and brings the content together in a single zip
    """
    full_zip_file = zipfile.ZipFile(full_zip_path, 'w', zipfile.ZIP_DEFLATED)

    for zip_path in zip_list_path:
        if zip_path != '':
            zip_file = zipfile.ZipFile('{}/{}'.format(settings.MEDIA_ROOT, zip_path), 'r')
            for unzipped_file in zip_file.namelist():
                full_zip_file.writestr(unzipped_file, zip_file.open(unzipped_file).read())

    full_zip_file.close()


def zip_all_orderitems(order):
    """
    Takes all zips'content from order items and makes one single zip of it
    calling _zip_them_all as a backgroud process.
    """
    zip_list_path = list(order.items.all().values_list('extract_result', flat=True))

    today = timezone.now()
    first_part = str(uuid.uuid4())[0:9]
    zip_path = Path(
        'extract',
        str(today.year), str(today.month),
        "{}{}.zip".format(first_part, str(order.id)))
    order.extract_result.name = zip_path.as_posix()
    full_zip_path = Path(settings.MEDIA_ROOT, zip_path)

    back_process = Process(target=_zip_them_all, args=(full_zip_path, zip_list_path))
    back_process.daemon = True
    back_process.start()
