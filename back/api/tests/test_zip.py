from api.helpers import _zip_them_all
from unittest import TestCase
import zipfile
from pathlib import Path

class ZipTest(TestCase):
    """
    Test Zips
    """

    def setUp(self):
        self.file = open("files/file.txt", "a")
        self.file.write("some data")
        self.file.close()

    def test_zip_duplicate_name(self):
        zip_file1 = zipfile.ZipFile('files/zip1.zip', 'w', zipfile.ZIP_DEFLATED)
        zip_file1.write(self.file.name, Path(self.file.name).name)
        zip_file1.close()
        zip_file2 = zipfile.ZipFile('files/zip2.zip', 'w', zipfile.ZIP_DEFLATED)
        zip_file2.write(self.file.name, Path(self.file.name).name)
        zip_file2.close()

        _zip_them_all('files/full_zip.zip', ['zip1.zip', 'zip2.zip', 'file.txt'])
