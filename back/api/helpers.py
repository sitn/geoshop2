import os
import uuid
from datetime import datetime
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
        extension = os.path.splitext(filename)[1]
        today = datetime.today()
        current_path = os.path.join(self.path_suffix, str(today.year), str(today.month), "{}{}")
        return current_path.format(uuid.uuid4(), extension)
