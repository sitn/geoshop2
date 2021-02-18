from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from api.models import Identity, Order, OrderItem

UserModel = get_user_model()

@receiver(post_save, sender=UserModel)
def create_user_profile(sender, instance, created, **kwargs):
    if created and Identity.objects.filter(user=instance).first() is None:
        Identity.objects.create(user=instance)

@receiver(post_save, sender=Identity)
def copy_identity_email(sender, instance, **kwargs):
    """
    Copy Identity.email to UserModel.email because auth functions are based
    UserModel.email
    """
    if instance.user:
        instance.user.email = instance.email
        instance.user.save()
