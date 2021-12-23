import zipfile
from unittest import TestCase
from pathlib import Path

from django.conf import settings

from api.helpers import _zip_them_all

class ZipTest(TestCase):
    """
    Test Zips
    """

    def setUp(self):
        self.file = open('{}/file.txt'.format(settings.MEDIA_ROOT), "a")
        self.file.write("some data")
        self.file.close()

    def test_zip_duplicate_name(self):
        zip_file1 = zipfile.ZipFile('{}/zip1.zip'.format(settings.MEDIA_ROOT), 'w', zipfile.ZIP_DEFLATED)
        zip_file1.write(self.file.name, Path(self.file.name).name)
        zip_file1.close()
        zip_file2 = zipfile.ZipFile('{}/zip2.zip'.format(settings.MEDIA_ROOT), 'w', zipfile.ZIP_DEFLATED)
        zip_file2.write(self.file.name, Path(self.file.name).name)
        zip_file2.close()

        _zip_them_all('{}/full_zip.zip'.format(settings.MEDIA_ROOT), ['zip1.zip', 'zip2.zip', 'file.txt'])
