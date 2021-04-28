import uuid
import zipfile
from pathlib import Path
from multiprocessing import Process
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import get_template, render_to_string
from django.utils import timezone
from django.utils.deconstruct import deconstructible

LANG = settings.LANGUAGE_CODE

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


def _render_email_templates(template_name, template_data):
    html_template_name = '{}_{}.html'.format(template_name, LANG)
    return (
        render_to_string(html_template_name, template_data),
        get_template(html_template_name).render(template_data),
    )


def send_geoshop_email(subject, message='', recipient=None, template_name=None, template_data=None):
    """
    Emailer for the geoshop. Will send email to admin or identities or raw email address.

    Parameters
    ----------
    subject : str
        The subject of email
    message : str
        The email message, also the body if template_name is None
    recipient : str or Identity or None
        If None, email is sent to admins
        If str, email is expected to be a valid email address
        If Identity, email will be sent to email property of the Identity instance
    template_name : str or None
        Any valid template as found in ./templates folder
    template_data : Dict or None
        A Dict containing data for the provided template name. Ignored if template_name
        is not given.
    """
    if template_name:
        if template_data is None:
            template_data = {'messages': [message]}
        (message, html_message) = _render_email_templates(template_name, template_data)
    if recipient is None:
        recipient_list = [settings.ADMIN_EMAIL_LIST]
    elif isinstance(recipient, str):
        recipient_list = [recipient]
    else:
        recipient_list = [recipient.email]
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        recipient_list,
        html_message=html_message,
        fail_silently=False,
    )


def _zip_them_all(full_zip_path, files_list_path):
    """
    Takes a list of zip paths and brings the content together in a single zip
    """
    full_zip_file = zipfile.ZipFile(full_zip_path, 'w', zipfile.ZIP_DEFLATED)

    for file_path in files_list_path:
        if file_path.endswith(".zip"):
            zip_file = zipfile.ZipFile('{}/{}'.format(settings.MEDIA_ROOT, file_path), 'r')
            for unzipped_file in zip_file.namelist():
                full_zip_file.writestr(unzipped_file, zip_file.open(unzipped_file).read())
        elif file_path != '':
            full_zip_file.write(
                '{}/{}'.format(settings.MEDIA_ROOT, file_path),
                Path(file_path).name)

    full_zip_file.close()


def zip_all_orderitems(order):
    """
    Takes all zips'content from order items and makes one single zip of it
    calling _zip_them_all as a backgroud process.
    """
    files_list_path = list(order.items.all().values_list('extract_result', flat=True))

    today = timezone.now()
    first_part = str(uuid.uuid4())[0:9]
    zip_path = Path(
        'extract',
        str(today.year), str(today.month),
        "{}{}.zip".format(first_part, str(order.id)))
    order.extract_result.name = zip_path.as_posix()
    full_zip_path = Path(settings.MEDIA_ROOT, zip_path)

    back_process = Process(target=_zip_them_all, args=(full_zip_path, files_list_path))
    back_process.daemon = True
    back_process.start()
